import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Server } from 'node:http';
import { AppModule } from './app.module';
import { createGlobalValidationPipe } from './validation.pipe';

export type AppCreator = () => Promise<INestApplication<Server>>;

export async function buildApp(
  createApp: AppCreator = () =>
    NestFactory.create<INestApplication<Server>>(AppModule),
): Promise<INestApplication<Server>> {
  const app = await createApp();
  app.useGlobalPipes(createGlobalValidationPipe());
  return app;
}
