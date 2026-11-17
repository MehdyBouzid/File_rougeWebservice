import { INestApplication } from '@nestjs/common';
import { afterEach, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Server } from 'node:http';
import { buildApp } from '../../src/app.factory';

export type IntegrationTestContext = {
  app: INestApplication<Server>;
  http: ReturnType<typeof request>;
  close: () => Promise<void>;
};

async function createIntegrationTestContext(): Promise<IntegrationTestContext> {
  const app = await buildApp();
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