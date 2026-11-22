import { Global, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { ProblemDetailsFilter } from '../../src/common/http/problem-details.filter';
import { createGlobalValidationPipe } from '../../src/validation.pipe';
import { DatabaseModule } from '../../src/persistence/database.module';

// Le test HTTP du squelette reste indépendant de PostgreSQL.
const stubDataSource = {
  options: { type: 'postgres' },
  entityMetadatas: [],
  getRepository: () => ({}),
  getMongoRepository: () => ({}),
  getTreeRepository: () => ({}),
  manager: {},
  query: () => Promise.resolve([]),
  transaction: () => Promise.resolve(),
};

@Global()
@Module({
  providers: [{ provide: DataSource, useValue: stubDataSource }],
  exports: [DataSource],
})
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
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("répond 404 en application/problem+json sur une route qui n'existe pas encore", () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toMatchObject({
          type: 'https://veillo.local/errors/not-found',
          status: 404,
        });
      });
  });
});
