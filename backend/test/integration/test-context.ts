import { INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Server } from 'node:http';
import { buildApp } from '../../src/app.factory';
import { AppModule } from '../../src/app.module';
import { DatabaseModule } from '../../src/persistence/database.module';

@Module({})
class TestDatabaseModule {}

export type IntegrationTestContext = {
  app: INestApplication<Server>;
  http: ReturnType<typeof request>;
  close: () => Promise<void>;
};

async function createIntegrationTestContext(): Promise<IntegrationTestContext> {
  const app = await buildApp(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    return moduleRef.createNestApplication<Server>();
  });
  await app.init();

  return {
    app,
    http: request(app.getHttpServer()),
    close: () => app.close(),
  };
}

export function setupIntegrationTestContext(): () => IntegrationTestContext {
  let context: IntegrationTestContext | undefined;

  beforeEach(async () => {
    context = await createIntegrationTestContext();
  });

  afterEach(async () => {
    if (context) {
      await context.close();
      context = undefined;
    }
  });

  return () => {
    if (!context) {
      throw new Error('Integration test context is not initialized');
    }

    return context;
  };
}