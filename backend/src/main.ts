import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/http/problem-details.filter';
import { createGlobalValidationPipe } from './validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
