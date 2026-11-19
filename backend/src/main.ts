import { buildApp } from './app.factory';

async function bootstrap(): Promise<void> {
  const app = await buildApp();
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap();
