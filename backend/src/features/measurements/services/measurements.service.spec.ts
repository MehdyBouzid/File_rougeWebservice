import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { AuthenticatedCaller } from '../../../common/auth/caller.types';
import type { AlertsService } from '../../alerts/services/alerts.service';
import type { CaregiversService } from '../../caregivers/services/caregivers.service';
import { MeasurementBatch } from '../entities/measurement-batch.entity';
import { Measurement } from '../entities/measurement.entity';
import { MeasurementsService } from './measurements.service';

const PATIENT_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_PATIENT_ID = '33333333-3333-4333-8333-333333333333';
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
  let dataSource: { transaction: jest.Mock };
  let caregiversService: { hasAccessToPatient: jest.Mock };
  let alertsService: {
    evaluateMeasurementsAndCreateAlerts: jest.Mock;
    notifyCaregiversOfNewAlerts: jest.Mock;
  };

  const watchCaller: AuthenticatedCaller = {
    id: 'simulator-01',
    scopes: ['montre'],
    authorizedPatientIds: [PATIENT_ID],
  };

  const caregiverCaller: AuthenticatedCaller = {
    id: CAREGIVER_ID,
    scopes: ['soignant'],
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

    it('renvoie 404 si le patient n’est pas autorisé pour cette montre (BOLA écriture)', async () => {
      await expect(
        service.ingestBatch(
          { ...validDto, patientId: OTHER_PATIENT_ID },
          watchCaller,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('renvoie 404 si le patient n’existe pas en base', async () => {
      managerQuery.mockResolvedValueOnce([]);

      await expect(service.ingestBatch(validDto, watchCaller)).rejects.toThrow(
        NotFoundException,
      );
      expect(batchInsert).not.toHaveBeenCalled();
    });

    it('renvoie 409 si le batchId existe déjà (violation unique 23505)', async () => {
      managerQuery.mockResolvedValueOnce([{ id_patient: PATIENT_ID }]);
      batchInsert.mockRejectedValueOnce({ code: '23505' });

      await expect(service.ingestBatch(validDto, watchCaller)).rejects.toThrow(
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

      const receipt = await service.ingestBatch(validDto, watchCaller);

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
        service.listPatientMeasurements(
          PATIENT_ID,
          {
            startDate: '2026-11-20T00:00:00Z',
            endDate: '2026-11-19T00:00:00Z',
          },
          caregiverCaller,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('renvoie 404 si le soignant ne suit pas le patient ou sans consentement valide (BOLA)', async () => {
      caregiversService.hasAccessToPatient.mockResolvedValueOnce(false);

      await expect(
        service.listPatientMeasurements(PATIENT_ID, {}, caregiverCaller),
      ).rejects.toThrow(NotFoundException);
    });

    it('retourne les mesures paginées avec métadonnées', async () => {
      caregiversService.hasAccessToPatient.mockResolvedValueOnce(true);
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

      const page = await service.listPatientMeasurements(
        PATIENT_ID,
        { page: 0, size: 50 },
        caregiverCaller,
      );

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
