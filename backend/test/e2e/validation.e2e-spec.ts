import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsInt } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { createGlobalValidationPipe } from '../../src/validation.pipe';

// Fixture technique réservée aux tests : aucun DTO ni endpoint métier n’est ajouté.
class ValidationProbeDto {
  @IsInt()
  value!: number;
}

@Controller('validation-probe')
class ValidationProbeController {
  @Post()
  check(@Body() dto: ValidationProbeDto) {
    return { value: dto.value, transformed: dto instanceof ValidationProbeDto };
  }
}

describe('Validation globale (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ValidationProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepte les données valides et les transforme en instance du DTO', async () => {
    await request(app.getHttpServer())
      .post('/validation-probe')
      .send({ value: 7 })
      .expect(201)
      .expect({ value: 7, transformed: true });
  });

  it('rejette une donnée qui ne respecte pas le décorateur', async () => {
    await request(app.getHttpServer())
      .post('/validation-probe')
      .send({ value: 1.5 })
      .expect(400);
  });

  it('rejette une propriété inconnue au lieu de la supprimer silencieusement', async () => {
    await request(app.getHttpServer())
      .post('/validation-probe')
      .send({ value: 7, unknown: true })
      .expect(400)
      .expect((response) => {
        expect(response.body).toMatchObject({
          message: ['property unknown should not exist'],
        });
      });
  });

  it('ne convertit pas implicitement une chaîne en nombre', async () => {
    await request(app.getHttpServer())
      .post('/validation-probe')
      .send({ value: '7' })
      .expect(400);
  });
});
