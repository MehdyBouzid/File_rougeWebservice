import assert from 'node:assert/strict';
import {
  mkdtemp,
  writeFile,
  mkdir,
  cp,
  symlink,
  readdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { checkMigrationFiles } from '../../../scripts/migrations.mjs';

async function folder() {
  return mkdtemp(join(tmpdir(), 'veillo-migration-test-'));
}

test('accepte le dossier vide et ignore les déclarations compilées', async () => {
  const root = await folder();
  await writeFile(join(root, '1700000000000-First.d.ts'), '');
  assert.deepEqual(await checkMigrationFiles(root), []);
});

test('ordonne les migrations chronologiquement', async () => {
  const root = await folder();
  await writeFile(join(root, '1700000000002-Second.ts'), '');
  await writeFile(join(root, '1700000000001-First.ts'), '');
  assert.deepEqual(
    (await checkMigrationFiles(root)).map((item) => item.name),
    ['First', 'Second'],
  );
});

test('refuse deux timestamps identiques', async () => {
  const root = await folder();
  await writeFile(join(root, '1700000000000-First.ts'), '');
  await writeFile(join(root, '1700000000000-Second.ts'), '');
  await assert.rejects(checkMigrationFiles(root), /Timestamp.*dupliqué/);
});

test('refuse deux descriptions identiques', async () => {
  const root = await folder();
  await writeFile(join(root, '1700000000000-First.ts'), '');
  await writeFile(join(root, '1700000000001-First.ts'), '');
  await assert.rejects(checkMigrationFiles(root), /Nom.*dupliqué/);
});

test('refuse un nom hors convention', async () => {
  const root = await folder();
  await writeFile(join(root, 'migration.ts'), '');
  await assert.rejects(checkMigrationFiles(root), /Nom invalide/);
});

test('contrôle les fichiers JavaScript compilés', async () => {
  const root = await folder();
  await writeFile(join(root, '1700000000000-First.js'), '');
  assert.equal((await checkMigrationFiles(root, 'js')).length, 1);
});

test('crée une migration TypeORM dans un espace temporaire, sans base ni fichier métier', async () => {
  const root = await folder();
  await mkdir(join(root, 'scripts'));
  await mkdir(join(root, 'src/persistence/migrations'), { recursive: true });
  await cp(
    new URL('../../../scripts/migrations.mjs', import.meta.url),
    join(root, 'scripts/migrations.mjs'),
  );
  await symlink(resolve('node_modules'), join(root, 'node_modules'));
  const result = spawnSync(
    process.execPath,
    [join(root, 'scripts/migrations.mjs'), 'create', 'TechnicalProbe'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const files = await readdir(join(root, 'src/persistence/migrations'));
  assert.equal(files.length, 1);
  assert.match(files[0], /^\d{13}-TechnicalProbe.ts$/);
  const duplicate = spawnSync(
    process.execPath,
    [join(root, 'scripts/migrations.mjs'), 'create', 'TechnicalProbe'],
    { encoding: 'utf8' },
  );
  assert.notEqual(duplicate.status, 0);
});
