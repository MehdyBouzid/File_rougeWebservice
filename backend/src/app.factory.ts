import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Server } from 'node:http';
import { AppModule } from './app.module';

export async function buildApp(): Promise<INestApplication<Server>> {
  return NestFactory.create<INestApplication<Server>>(AppModule);
}
