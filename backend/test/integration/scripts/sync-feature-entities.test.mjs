import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { syncFeatureEntities } from '../../../scripts/sync-feature-entities.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'veillo-entities-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const featuresRoot = join(root, 'features');
  for (const name of [
    'patients',
    'measurements',
    'thresholds',
    'alerts',
    'consents',
    'caregivers',
  ]) {
    await mkdir(join(featuresRoot, name, 'entities'), { recursive: true });
  }
  return { featuresRoot, output: join(root, 'registry.ts') };
}

test('le registre vide reste sans entité et sa génération est idempotente', async (t) => {
  const options = await fixture(t);
  assert.deepEqual(await syncFeatureEntities(options), {
    entities: 0,
    changed: true,
  });
  assert.deepEqual(await syncFeatureEntities(options), {
    entities: 0,
    changed: false,
  });
  await syncFeatureEntities({ ...options, check: true });
});

test('détecte une Entity importée avec alias sans exécuter son fichier', async (t) => {
  const options = await fixture(t);
  await writeFile(
    join(options.featuresRoot, 'measurements/entities/sample.entity.ts'),
    `
    import { Entity as Persisted } from 'typeorm';
    throw new Error('Ce fichier ne doit pas être exécuté par le générateur.');
    @Persisted()
    export class SampleRecord {}
    export class PlainClass {}
  `,
  );
  const result = await syncFeatureEntities(options);
  assert.equal(result.entities, 1);
  const source = await readFile(options.output, 'utf8');
  assert.match(source, /SampleRecord as RegisteredEntity0/);
  assert.doesNotMatch(source, /PlainClass/);
  assert.match(source, /measurements: \[RegisteredEntity0\]/);
});

test('le contrôle détecte une nouvelle ViewEntity et ne modifie pas le registre', async (t) => {
  const options = await fixture(t);
  await syncFeatureEntities(options);
  const previous = await readFile(options.output, 'utf8');
  await writeFile(
    join(options.featuresRoot, 'alerts/entities/sample.entity.ts'),
    `
    import { ViewEntity } from 'typeorm';
    @ViewEntity()
    export class SampleView {}
  `,
  );
  await assert.rejects(
    syncFeatureEntities({ ...options, check: true }),
    /Registre périmé/,
  );
  assert.equal(await readFile(options.output, 'utf8'), previous);
  assert.equal((await syncFeatureEntities(options)).entities, 1);
});

test('refuse les exports par défaut sans écraser le registre existant', async (t) => {
  const options = await fixture(t);
  await syncFeatureEntities(options);
  const previous = await readFile(options.output, 'utf8');
  await writeFile(
    join(options.featuresRoot, 'caregivers/entities/sample.entity.ts'),
    `
    import { Entity } from 'typeorm';
    @Entity()
    export default class SampleRecord {}
  `,
  );
  await assert.rejects(syncFeatureEntities(options), /export de classe nommé/);
  assert.equal(await readFile(options.output, 'utf8'), previous);
});
