import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import * as OpenApiValidator from 'express-openapi-validator';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/http/problem-details.filter';
import { createGlobalValidationPipe } from './validation.pipe';

export function configureHttp(app: INestApplication): void {
  app.use(
    ...OpenApiValidator.middleware({
      apiSpec: resolve(__dirname, '../../openapi/openapi.bundle.yaml'),
      validateRequests: false,
      validateResponses: true,
      validateSecurity: false,
      fileUploader: false,
      ignoreUndocumented: true,
    }),
  );
  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureHttp(app);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
if (require.main === module) {
  void bootstrap();
}
