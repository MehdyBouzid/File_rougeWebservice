import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { DatabaseModule } from '../../src/persistence/database.module';

// Ce test vérifie l’assemblage NestJS sans demander une connexion PostgreSQL.
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

describe('AppModule', () => {
  it('se compile', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    expect(moduleRef.get(AppModule)).toBeInstanceOf(AppModule);
    await moduleRef.close();
  });
});
