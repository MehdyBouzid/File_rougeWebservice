import { createDatabaseOptions } from '../../../src/persistence/database.config';
import { featureEntities } from '../../../src/persistence/feature-entities.generated';

describe('Configuration PostgreSQL', () => {
  const env = {
    DB_HOST: 'postgres',
    DB_PORT: '5432',
    DB_NAME: 'test',
    DB_USER: 'test',
    DB_PASSWORD: 'test-only',
  };

  it('utilise les variables et ne modifie pas automatiquement le schéma', () => {
    expect(createDatabaseOptions(env)).toMatchObject({
      host: 'postgres',
      port: 5432,
      database: 'test',
      synchronize: false,
      migrationsRun: false,
      entities: Object.values(featureEntities).flat(),
    });
  });

  it('refuse un mot de passe absent', () => {
    expect(() => createDatabaseOptions({ ...env, DB_PASSWORD: '' })).toThrow(
      'Variable requise : DB_PASSWORD',
    );
  });

  it.each(['abc', '0', '65536', '5432.5'])(
    'refuse le port invalide %s',
    (DB_PORT) => {
      expect(() => createDatabaseOptions({ ...env, DB_PORT })).toThrow(
        'DB_PORT',
      );
    },
  );
});
