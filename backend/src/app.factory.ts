import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Server } from 'node:http';
import { AppModule } from './app.module';
import { createGlobalValidationPipe } from './validation.pipe';

export async function buildApp(): Promise<INestApplication<Server>> {
  const app = await NestFactory.create<INestApplication<Server>>(AppModule);
  app.useGlobalPipes(createGlobalValidationPipe());
  return app;
}
