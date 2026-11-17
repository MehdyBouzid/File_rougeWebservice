import { Test } from '@nestjs/testing';
import { Module } from '@nestjs/common';
import { AppModule } from './app.module';
import { DatabaseModule } from './persistence/database.module';

// Ce test vérifie l’assemblage NestJS sans demander une connexion PostgreSQL.
@Module({})
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
