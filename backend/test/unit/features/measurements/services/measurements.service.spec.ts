import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { AlertsService } from '../../../../../src/features/alerts/services/alerts.service';
import type { CaregiversService } from '../../../../../src/features/caregivers/services/caregivers.service';
import { MeasurementBatch } from '../../../../../src/features/measurements/entities/measurement-batch.entity';
import { Measurement } from '../../../../../src/features/measurements/entities/measurement.entity';
import { MeasurementsService } from '../../../../../src/features/measurements/services/measurements.service';

const PATIENT_ID = '22222222-2222-4222-8222-222222222222';
const CAREGIVER_ID = '11111111-1111-4111-8111-111111111111';

describe('MeasurementsService', () => {
  let service: MeasurementsService;
  let measurementsRepo: { createQueryBuilder: jest.Mock };
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let batchInsert: jest.Mock;
  let measurementCreate: jest.Mock;
  let measurementSave: jest.Mock;
  let managerQuery: jest.Mock;
  let dataSource: { query: jest.Mock; transaction: jest.Mock };
  let caregiversService: { hasAccessToPatient: jest.Mock };
  let alertsService: {
    evaluateMeasurementsAndCreateAlerts: jest.Mock;
    notifyCaregiversOfNewAlerts: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };
    measurementsRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    batchInsert = jest.fn();
    measurementCreate = jest.fn((data: Measurement) => data);
    measurementSave = jest.fn((entities: Measurement[]) =>
      Promise.resolve(entities),
    );
    managerQuery = jest.fn();

    const manager = {
      query: managerQuery,
      getRepository: jest.fn((entity: unknown) => {
        if (entity === MeasurementBatch) {
          return { insert: batchInsert };
        }
        if (entity === Measurement) {
          return { create: measurementCreate, save: measurementSave };
        }
        throw new Error('Unexpected repository');
      }),
    } as unknown as EntityManager;

    dataSource = {
      query: jest.fn(),
      transaction: jest.fn(
        (callback: (txManager: EntityManager) => Promise<unknown>) =>
          callback(manager),
      ),
    };
    caregiversService = {
      hasAccessToPatient: jest.fn(),
    };
    alertsService = {
      evaluateMeasurementsAndCreateAlerts: jest.fn().mockResolvedValue({
        createdAlertIds: [],
        recipientCaregiverIds: [],
      }),
      notifyCaregiversOfNewAlerts: jest.fn(),
    };

    service = new MeasurementsService(
      measurementsRepo as unknown as Repository<Measurement>,
      dataSource as unknown as DataSource,
      caregiversService as unknown as CaregiversService,
      alertsService as unknown as AlertsService,
    );
  });

  describe('ingestBatch', () => {
    const validDto = {
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

    it('renvoie 404 si patientId n’est pas un UUID valide', async () => {
      await expect(
        service.ingestBatch({ ...validDto, patientId: 'invalide' }),
      ).rejects.toThrow(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('renvoie 404 si le patient n’existe pas en base', async () => {
      managerQuery.mockResolvedValueOnce([]);

      await expect(service.ingestBatch(validDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(batchInsert).not.toHaveBeenCalled();
    });

    it('renvoie 409 si le batchId existe déjà (violation unique 23505)', async () => {
      managerQuery.mockResolvedValueOnce([{ id_patient: PATIENT_ID }]);
      batchInsert.mockRejectedValueOnce({ code: '23505' });

      await expect(service.ingestBatch(validDto)).rejects.toThrow(
        ConflictException,
      );
      expect(measurementSave).not.toHaveBeenCalled();
    });

    it('enregistre le lot, les mesures, évalue les seuils et déclenche une notification générique si alerte', async () => {
      managerQuery.mockResolvedValueOnce([{ id_patient: PATIENT_ID }]);
      batchInsert.mockResolvedValueOnce({});
      alertsService.evaluateMeasurementsAndCreateAlerts.mockResolvedValueOnce({
        createdAlertIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
        recipientCaregiverIds: [CAREGIVER_ID],
      });

      const receipt = await service.ingestBatch(validDto);

      expect(receipt).toEqual({
        batchId: 'lot-001',
        patientId: PATIENT_ID,
        count: 1,
      });
      expect(measurementSave).toHaveBeenCalledTimes(1);
      expect(
        alertsService.evaluateMeasurementsAndCreateAlerts,
      ).toHaveBeenCalledTimes(1);
      expect(alertsService.notifyCaregiversOfNewAlerts).toHaveBeenCalledWith(
        [CAREGIVER_ID],
        1,
      );
    });
  });

  describe('listPatientMeasurements', () => {
    it('renvoie 400 si startDate est postérieure à endDate', async () => {
      await expect(
        service.listPatientMeasurements(PATIENT_ID, {
          startDate: '2026-11-20T00:00:00Z',
          endDate: '2026-11-19T00:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('renvoie 404 si le patient n’existe pas en base', async () => {
      dataSource.query.mockResolvedValueOnce([]);

      await expect(
        service.listPatientMeasurements(PATIENT_ID, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('renvoie 404 si caregiverId est fourni sans suivi/consentement valide', async () => {
      caregiversService.hasAccessToPatient.mockResolvedValueOnce(false);

      await expect(
        service.listPatientMeasurements(PATIENT_ID, {}, CAREGIVER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('retourne les mesures paginées avec métadonnées et links', async () => {
      dataSource.query.mockResolvedValueOnce([{ id_patient: PATIENT_ID }]);
      queryBuilder.getManyAndCount.mockResolvedValueOnce([
        [
          {
            idMesure: 'm1',
            horodatage: new Date('2026-11-19T10:00:00Z'),
            frequenceCardiaque: 75,
            spo2: 98,
            pas: 120,
            idPatient: PATIENT_ID,
          },
        ],
        51,
      ]);

      const page = await service.listPatientMeasurements(PATIENT_ID, {
        page: 0,
        size: 50,
      });

      expect(page).toEqual({
        items: [
          {
            horodatage: '2026-11-19T10:00:00.000Z',
            frequenceCardiaque: 75,
            spo2: 98,
            pas: 120,
          },
        ],
        page: 0,
        size: 50,
        totalItems: 51,
        totalPages: 2,
        links: {
          self: `/patients/${PATIENT_ID}/measurements?page=0&size=50`,
          next: `/patients/${PATIENT_ID}/measurements?page=1&size=50`,
          prev: null,
        },
      });
    });
  });
});
