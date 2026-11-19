import { join } from 'node:path';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { featureEntities } from './feature-entities.generated';

export function createDatabaseOptions(
  env: NodeJS.ProcessEnv = process.env,
): PostgresConnectionOptions {
  const required = (key: string): string => {
    const value = env[key];
    if (!value) throw new Error(`Variable requise : ${key}`);
    return value;
  };
  const port = Number(env.DB_PORT ?? '5432');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT doit être un entier entre 1 et 65535.');
  }

  return {
    type: 'postgres',
    host: required('DB_HOST'),
    port,
    username: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
    applicationName: 'veillo-backend',
    entities: Object.values(featureEntities).flat(),
    migrations: [
      join(
        __dirname,
        'migrations',
        __filename.endsWith('.ts') ? '*.ts' : '*.js',
      ),
    ],
    migrationsTableName: 'veillo_migrations',
    migrationsTransactionMode: 'all',
    synchronize: false,
    migrationsRun: false,
    logging: false,
  };
}
