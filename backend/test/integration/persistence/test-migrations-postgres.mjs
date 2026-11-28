import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, cp, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { DataSource } from 'typeorm';

const require = createRequire(import.meta.url);
const options = require('../../../dist/persistence/data-source.js').default.options;
const database = `veillo_migrations_test_${Date.now()}`;
const admin = new DataSource({ ...options, migrations: [] });
let isolated;

async function fingerprint() {
  return JSON.stringify({
    history: await admin.query(
      'SELECT id, timestamp, name FROM public.veillo_migrations ORDER BY id',
    ),
    tables: await admin.query(
      "SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2",
    ),
  });
}

try {
  await admin.initialize();
  const before = await fingerprint();
  assert.notEqual(database, options.database);
  assert.match(database, /^veillo_migrations_test_\d+$/);
  await admin.query(`CREATE DATABASE "${database}"`);
  isolated = new DataSource({ ...options, database, migrations: [] });
  await isolated.initialize();
  assert.equal(
    (await isolated.query('SELECT current_database() AS name'))[0].name,
    database,
  );
  const original = (
    await isolated.query(
      "SELECT obj_description(oid, 'pg_namespace') AS comment FROM pg_namespace WHERE nspname='public'",
    )
  )[0].comment;

  // Les scripts et le DataSource compilé sont copiés dans un espace temporaire isolé.
  const workspace = await mkdtemp(join(tmpdir(), 'veillo-pg-migration-'));
  await cp(resolve('dist'), join(workspace, 'dist'), {
    recursive: true,
    // Ce test ne doit jamais embarquer les futures migrations métier.
    filter: (source) => source !== resolve('dist/persistence/migrations'),
  });
  await mkdir(join(workspace, 'scripts'));
  await cp(
    new URL('../../../scripts/migrations.mjs', import.meta.url),
    join(workspace, 'scripts/migrations.mjs'),
  );
  await cp(resolve('package.json'), join(workspace, 'package.json'));
  await symlink(resolve('node_modules'), join(workspace, 'node_modules'));
  const folder = join(workspace, 'dist/persistence/migrations');
  await mkdir(folder, { recursive: true });
  const timestamp = Date.now();
  const restore =
    original === null ? 'NULL' : `'${original.replaceAll("'", "''")}'`;
  // Fixture exclusivement temporaire : aucun objet métier ni table supplémentaire.
  await writeFile(
    join(folder, `${timestamp}-TechnicalProbe.js`),
    `
    module.exports = class TechnicalProbe${timestamp} {
      async up(queryRunner) {
        await queryRunner.query("COMMENT ON SCHEMA public IS 'veillo-migration-probe'");
      }
      async down(queryRunner) {
        await queryRunner.query(${JSON.stringify('COMMENT ON SCHEMA public IS ' + restore)});
      }
    };
  `,
  );
  function command(name) {
    const result = spawnSync('npm', ['run', name], {
      cwd: workspace,
      env: { ...process.env, DB_NAME: database },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    console.log(result.stdout.trim());
    return result.stdout;
  }
  command('migration:check');
  assert.match(command('migration:show'), /\[ \].*TechnicalProbe/);
  command('migration:run');
  assert.match(command('migration:show'), /\[X\].*TechnicalProbe/);
  assert.equal(
    (
      await isolated.query(
        'SELECT count(*)::int AS count FROM public.veillo_migrations',
      )
    )[0].count,
    1,
  );
  assert.equal(
    (
      await isolated.query(
        "SELECT obj_description(oid, 'pg_namespace') AS comment FROM pg_namespace WHERE nspname='public'",
      )
    )[0].comment,
    'veillo-migration-probe',
  );
  command('migration:revert');
  assert.equal(
    (
      await isolated.query(
        'SELECT count(*)::int AS count FROM public.veillo_migrations',
      )
    )[0].count,
    0,
  );
  assert.equal(
    (
      await isolated.query(
        "SELECT obj_description(oid, 'pg_namespace') AS comment FROM pg_namespace WHERE nspname='public'",
      )
    )[0].comment,
    original,
  );
  assert.match(command('migration:show'), /\[ \].*TechnicalProbe/);
  assert.equal(await fingerprint(), before);
  console.log(
    `OK : commandes npm, découverte, statut, up et down vérifiés dans ${database}.`,
  );
  console.log(
    'Base de développement inchangée ; base de test conservée, aucune table ni base supprimée.',
  );
} catch (error) {
  console.error(error.message);
  console.error(`Base de test à examiner si créée : ${database}`);
  process.exitCode = 1;
} finally {
  if (isolated?.isInitialized) await isolated.destroy();
  if (admin.isInitialized) await admin.destroy();
}
