import { existsSync, realpathSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Contrôle les noms locaux ; les dépendances SQL nécessitent toujours une revue commune.
export async function checkMigrationFiles(folder, extension = 'ts') {
  if (!existsSync(folder)) return [];
  const files = (await readdir(folder, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(`.${extension}`) &&
        !entry.name.endsWith('.d.ts'),
    )
    .map((entry) => entry.name)
    .sort();
  const timestamps = new Set();
  const names = new Set();
  const migrations = [];
  for (const file of files) {
    const match = /^(\d{13})-([A-Z][A-Za-z0-9]*)\.(ts|js)$/.exec(file);
    if (!match)
      throw new Error(
        `Nom invalide : ${file}. Attendu : <timestamp13>-DescriptionPascalCase.${extension}`,
      );
    const [, timestamp, name] = match;
    if (timestamps.has(timestamp))
      throw new Error(`Timestamp de migration dupliqué : ${timestamp}`);
    if (names.has(name)) throw new Error(`Nom de migration dupliqué : ${name}`);
    timestamps.add(timestamp);
    names.add(name);
    migrations.push({ timestamp: Number(timestamp), name, file });
  }
  return migrations;
}

function execute(command, args) {
  const result = spawnSync(command, args, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `Commande interrompue (${result.status ?? result.signal}) : ${command}`,
    );
}

async function main() {
  const [operation, name, ...extra] = process.argv.slice(2);
  const source = join(backendRoot, 'src/persistence/migrations');
  const compiled = join(backendRoot, 'dist/persistence/migrations');
  const cli = join(backendRoot, 'node_modules/typeorm/cli.js');
  const envFile = resolve(backendRoot, '../.env');
  // Les variables déjà fournies par Compose restent prioritaires.
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  if (operation === 'check') {
    if (name || extra.length)
      throw new Error('migration:check ne prend aucun argument.');
    const migrations = await checkMigrationFiles(
      existsSync(source) ? source : compiled,
      existsSync(source) ? 'ts' : 'js',
    );
    console.log(
      `${migrations.length} migration(s) : noms et timestamps locaux sans doublon.`,
    );
    return;
  }
  if (operation === 'create' || operation === 'generate') {
    if (!name || !/^[A-Z][A-Za-z0-9]*$/.test(name) || extra.length) {
      throw new Error(
        'Fournir un seul nom PascalCase, sans chemin : npm run migration:create -- DescriptionEvolution',
      );
    }
    const migrations = await checkMigrationFiles(source);
    const timestamp = Date.now();
    if (
      migrations.some(
        (migration) =>
          migration.name === name || migration.timestamp >= timestamp,
      )
    ) {
      throw new Error(
        'Nom déjà utilisé ou horodatage local non postérieur : vérifier les migrations et l’horloge avant de réessayer.',
      );
    }
    if (operation === 'generate') execute('npm', ['run', 'build']);
    const args = [
      cli,
      `migration:${operation}`,
      join(source, name),
      '--timestamp',
      String(timestamp),
    ];
    if (operation === 'generate')
      args.push('-d', join(backendRoot, 'dist/persistence/data-source.js'));
    execute(process.execPath, args);
    await checkMigrationFiles(source);
    return;
  }
  if (!['show', 'run', 'revert'].includes(operation) || name || extra.length) {
    throw new Error(
      'Commande attendue : check, create, generate, show, run ou revert.',
    );
  }
  const dataSource = join(backendRoot, 'dist/persistence/data-source.js');
  if (!existsSync(dataSource))
    throw new Error(
      'DataSource compilé absent : exécuter npm run build ou reconstruire l’image.',
    );
  await checkMigrationFiles(compiled, 'js');
  execute(process.execPath, [cli, `migration:${operation}`, '-d', dataSource]);
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
