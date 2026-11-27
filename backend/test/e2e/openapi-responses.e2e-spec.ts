import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpException,
  type INestApplication,
  Logger,
  Patch,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { MeasurementBatchDto } from '../../src/features/measurements/dto/measurement-batch.dto';
import { configureHttp } from '../../src/main';

// Routes techniques de test uniquement : aucun Controller métier n'est modifié.
const reply = jest.fn<unknown, []>();

@Controller()
class ResponseProbeController {
  @Get('alerts/:alertId')
  alert() {
    return reply();
  }

  @Post('measurements')
  @HttpCode(201)
  ingest(@Body() body: MeasurementBatchDto) {
    void body;
    return reply();
  }

  @Patch('patients/:patientId/seuils/:seuilId')
  patchThreshold() {
    return reply();
  }

  @Delete('patients/me/consents/:consentId')
  @HttpCode(204)
  withdraw() {}

  @Get('patients/:patientId/seuils/:seuilId')
  @HttpCode(304)
  @Header('ETag', '"probe"')
  notModified() {}

  @Get('undocumented-probe')
  undocumented() {
    return { untouched: true };
  }
}

const batch = {
  patientId: 'patient-test',
  batchId: 'lot-test',
  measurements: [
    {
      horodatage: '2026-11-19T10:00:00Z',
      frequenceCardiaque: 75,
      spo2: 98,
      pas: 120,
    },
  ],
};

const alert = {
  alertId: 'alert-test',
  patientId: 'patient-test',
  typeMesure: 'FREQUENCE_CARDIAQUE',
  valeurMesuree: 125,
  valeurSeuil: 110,
  statut: 'ACTIVE',
  horodatage: '2026-11-19T10:00:00Z',
};

describe('Validation OpenAPI des réponses (bundle réel)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ResponseProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureHttp(app);
    await app.init();
  });

  beforeEach(() => reply.mockReset());

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => app.close());

  it('charge le bundle et accepte un détail d’alerte conforme', async () => {
    reply.mockReturnValue(alert);
    await request(app.getHttpServer())
      .get('/alerts/alert-test')
      .expect(200)
      .expect(alert);
  });

  it('bloque un JSON invalide et conserve une erreur 500 RFC 9457', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    reply.mockReturnValue({ ...alert, valeurMesuree: 'invalide' });
    await request(app.getHttpServer())
      .get('/alerts/alert-test')
      .expect(500)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 500,
          detail: 'Une erreur interne est survenue.',
        });
        expect(body).not.toHaveProperty('valeurMesuree');
      });
  });

  it('laisse le ValidationPipe rejeter une entrée invalide en RFC 9457', async () => {
    await request(app.getHttpServer())
      .post('/measurements')
      .send({ ...batch, measurements: [] })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(({ body }) => expect(body).toMatchObject({ status: 400 }));
    expect(reply).not.toHaveBeenCalled();
  });

  it('accepte un lot conforme sans garantir le header Location de la réponse', async () => {
    reply.mockReturnValue({});
    const response = await request(app.getHttpServer())
      .post('/measurements')
      .send(batch)
      .expect(201);
    expect(reply).toHaveBeenCalledTimes(1);
    expect(response.headers).not.toHaveProperty('location');
  });

  it.each([
    [400, new BadRequestException('Lot invalide.')],
    [409, new ConflictException('Lot déjà reçu.')],
  ])('conserve une erreur métier %i RFC 9457', async (status, exception) => {
    reply.mockImplementation(() => {
      throw exception;
    });
    await request(app.getHttpServer())
      .post('/measurements')
      .send(batch)
      .expect(status)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(({ body }) => expect(body).toMatchObject({ status }));
  });

  it.each([401, 403, 404, 412, 428])(
    'préserve le statut %i émis par NestJS malgré un corps vide',
    async (status) => {
      reply.mockImplementation(() => {
        throw new HttpException('Erreur technique de test.', status);
      });
      await request(app.getHttpServer())
        .patch('/patients/patient-test/seuils/seuil-test')
        .send({})
        .expect(status)
        .expect('Content-Type', /application\/problem\+json/)
        .expect(({ body }) => expect(body).toMatchObject({ status }));
    },
  );

  it('laisse une route non documentée répondre sans validation contractuelle', async () => {
    await request(app.getHttpServer())
      .get('/undocumented-probe')
      .expect(200)
      .expect({ untouched: true });
  });

  it('laisse NestJS produire le 404 des routes absentes', async () => {
    await request(app.getHttpServer())
      .get('/absent-probe')
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/);
  });

  it('laisse NestJS gérer une méthode non documentée', async () => {
    await request(app.getHttpServer())
      .post('/alerts/alert-test')
      .send({})
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/);
  });

  it('préserve un 204 sans corps', async () => {
    const response = await request(app.getHttpServer())
      .delete('/patients/me/consents/consent-test')
      .expect(204);
    expect(response.text).toBe('');
  });

  it('préserve un 304 sans corps et son ETag', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/patient-test/seuils/seuil-test')
      .set('If-None-Match', '"probe"')
      .expect(304)
      .expect('ETag', '"probe"');
    expect(response.text).toBe('');
  });
});
