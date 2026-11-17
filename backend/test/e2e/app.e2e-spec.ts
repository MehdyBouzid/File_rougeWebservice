import { Test } from '@nestjs/testing';
import { INestApplication, Module } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { createGlobalValidationPipe } from '../../src/validation.pipe';
import { DatabaseModule } from '../../src/persistence/database.module';

// Le test HTTP du squelette reste indépendant de PostgreSQL.
@Module({})
class TestDatabaseModule {}

describe('Application (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("répond 404 sur une route qui n'existe pas encore", () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });
});
