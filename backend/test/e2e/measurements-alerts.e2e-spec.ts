import {
  ConflictException,
  type INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { CallerAuthGuard } from '../../src/common/auth/caller-auth.guard';
import { MeasurementType } from '../../src/common/types/measurement-type.enum';
import { AlertsController } from '../../src/features/alerts/controllers/alerts.controller';
import { AlertStatus } from '../../src/features/alerts/entities/alert.entity';
import { AlertsService } from '../../src/features/alerts/services/alerts.service';
import { MeasurementsController } from '../../src/features/measurements/controllers/measurements.controller';
import { MeasurementsService } from '../../src/features/measurements/services/measurements.service';
import { createGlobalValidationPipe } from '../../src/validation.pipe';

const CAREGIVER_ID = '11111111-1111-4111-8111-111111111111';
const PATIENT_ID = '22222222-2222-4222-8222-222222222222';
const ALERT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('Mesures et Alertes — contrat HTTP (e2e)', () => {
  let app: INestApplication<App>;
  let measurementsService: {
    ingestBatch: jest.Mock;
    listPatientMeasurements: jest.Mock;
  };
  let alertsService: {
    listAlerts: jest.Mock;
    getAlertDetail: jest.Mock;
    acknowledgeAlert: jest.Mock;
  };

  beforeAll(async () => {
    measurementsService = {
      ingestBatch: jest.fn(),
      listPatientMeasurements: jest.fn(),
    };
    alertsService = {
      listAlerts: jest.fn(),
      getAlertDetail: jest.fn(),
      acknowledgeAlert: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [MeasurementsController, AlertsController],
      providers: [
        CallerAuthGuard,
        { provide: MeasurementsService, useValue: measurementsService },
        { provide: AlertsService, useValue: alertsService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('renvoie 401 + WWW-Authenticate + application/problem+json sans authentification', async () => {
    await request(app.getHttpServer())
      .get('/alerts')
      .expect(401)
      .expect('WWW-Authenticate', 'Bearer')
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toMatchObject({
          type: 'https://veillo.local/errors/unauthorized',
          status: 401,
        });
      });
  });

  it('renvoie 403 en application/problem+json si le scope est insuffisant (BFLA)', async () => {
    await request(app.getHttpServer())
      .get('/alerts')
      .set('X-Caller-Scope', 'montre')
      .expect(403)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toMatchObject({
          type: 'https://veillo.local/errors/forbidden',
          status: 403,
        });
      });
  });

  it('POST /measurements crée un lot (201 + Location) puis renvoie 409 sur doublon', async () => {
    measurementsService.ingestBatch
      .mockResolvedValueOnce({
        batchId: 'lot-001',
        patientId: PATIENT_ID,
        count: 1,
      })
      .mockRejectedValueOnce(
        new ConflictException('Ce lot de mesures a déjà été enregistré.'),
      );

    const payload = {
      patientId: PATIENT_ID,
      batchId: 'lot-001',
      measurements: [
        {
          horodatage: '2026-11-19T10:00:00Z',
          frequenceCardiaque: 75,
          spo2: 98,
          pas: 120,
        },
      ],
    };

    await request(app.getHttpServer())
      .post('/measurements')
      .set('X-Caller-Scope', 'montre')
      .send(payload)
      .expect(201)
      .expect('Location', '/measurements/lot-001')
      .expect({
        batchId: 'lot-001',
        patientId: PATIENT_ID,
        count: 1,
      });

    await request(app.getHttpServer())
      .post('/measurements')
      .set('X-Caller-Scope', 'montre')
      .send(payload)
      .expect(409)
      .expect('Content-Type', /application\/problem\+json/);
  });

  it('POST /measurements rejette 400 avec errors si un relevé est invalide ou champ inconnu', async () => {
    await request(app.getHttpServer())
      .post('/measurements')
      .set('X-Caller-Scope', 'montre')
      .send({
        patientId: PATIENT_ID,
        batchId: 'lot-bad',
        measurements: [],
        inconnu: true,
      })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        const body = res.body as {
          type?: string;
          status?: number;
          errors?: string[];
        };
        expect(body.type).toBe('https://veillo.local/errors/validation');
        expect(body.status).toBe(400);
        expect(Array.isArray(body.errors)).toBe(true);
        expect(body.errors?.length).toBeGreaterThan(0);
      });
  });

  it('GET /patients/:patientId/measurements renvoie 400 si size > 100 et 404 hors périmètre', async () => {
    await request(app.getHttpServer())
      .get(`/patients/${PATIENT_ID}/measurements?size=101`)
      .set('X-Caller-Scope', 'soignant')
      .set('X-Caregiver-Id', CAREGIVER_ID)
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);

    measurementsService.listPatientMeasurements.mockRejectedValueOnce(
      new NotFoundException('Patient introuvable.'),
    );

    await request(app.getHttpServer())
      .get(`/patients/${PATIENT_ID}/measurements`)
      .set('X-Caller-Scope', 'soignant')
      .set('X-Caregiver-Id', CAREGIVER_ID)
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/);
  });

  it('PATCH /alerts/:alertId valide le corps (400) et acquitte une alerte (200)', async () => {
    await request(app.getHttpServer())
      .patch(`/alerts/${ALERT_ID}`)
      .set('X-Caller-Scope', 'soignant')
      .set('X-Caregiver-Id', CAREGIVER_ID)
      .send({ statut: 'ACTIVE' })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);

    const detail = {
      alertId: ALERT_ID,
      patientId: PATIENT_ID,
      typeMesure: MeasurementType.FREQUENCE_CARDIAQUE,
      valeurMesuree: 125,
      valeurSeuil: 110,
      statut: AlertStatus.TRAITEE,
      horodatage: '2026-11-20T10:00:00.000Z',
    };
    alertsService.acknowledgeAlert.mockResolvedValueOnce(detail);

    await request(app.getHttpServer())
      .patch(`/alerts/${ALERT_ID}`)
      .set('X-Caller-Scope', 'soignant')
      .set('X-Caregiver-Id', CAREGIVER_ID)
      .send({ statut: 'TRAITEE' })
      .expect(200)
      .expect(detail);
  });
});
