import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { AuthenticatedCaller } from '../../../common/auth/caller.types';
import { MeasurementType } from '../../../common/types/measurement-type.enum';
import type { CaregiversService } from '../../caregivers/services/caregivers.service';
import type { Measurement } from '../../measurements/entities/measurement.entity';
import { Alert, AlertStatus } from '../entities/alert.entity';
import { AlertsService } from './alerts.service';

const CAREGIVER_ID = '11111111-1111-4111-8111-111111111111';
const PATIENT_ID = '22222222-2222-4222-8222-222222222222';
const ALERT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const THRESHOLD_FC_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const THRESHOLD_SPO2_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MEASUREMENT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

describe('AlertsService', () => {
  let service: AlertsService;
  let alertsRepo: Record<string, jest.Mock>;
  let dataSource: { query: jest.Mock; transaction: jest.Mock };
  let txManager: { query: jest.Mock; getRepository: jest.Mock };
  let alertSaveMock: jest.Mock;
  let caregiversService: { getCaregiversForPatient: jest.Mock };

  const caller: AuthenticatedCaller = {
    id: CAREGIVER_ID,
    scopes: ['soignant'],
  };

  beforeEach(() => {
    alertsRepo = {};
    alertSaveMock = jest.fn((alerts: Alert[]) => Promise.resolve(alerts));
    txManager = {
      query: jest.fn(),
      getRepository: jest.fn(() => ({
        create: jest.fn((data: Alert) => data),
        save: alertSaveMock,
      })),
    };
    dataSource = {
      query: jest.fn(),
      transaction: jest.fn(
        (callback: (manager: EntityManager) => Promise<unknown>) =>
          callback(txManager as unknown as EntityManager),
      ),
    };
    caregiversService = {
      getCaregiversForPatient: jest.fn().mockResolvedValue([CAREGIVER_ID]),
    };

    service = new AlertsService(
      alertsRepo as unknown as Repository<Alert>,
      dataSource as unknown as DataSource,
      caregiversService as unknown as CaregiversService,
    );
  });

  describe('evaluateMeasurementsAndCreateAlerts', () => {
    const sampleMeasurement: Measurement = {
      idMesure: MEASUREMENT_ID,
      horodatage: new Date('2026-11-19T10:00:00Z'),
      frequenceCardiaque: 125,
      spo2: 88,
      pas: 50,
      idPatient: PATIENT_ID,
    };

    it('ne crée aucune alerte si les valeurs sont dans l’intervalle (bornes incluses)', async () => {
      txManager.query.mockResolvedValueOnce([
        {
          id_seuil: THRESHOLD_FC_ID,
          type_mesure: MeasurementType.FREQUENCE_CARDIAQUE,
          valeur_min: '60.00',
          valeur_max: '125.00',
        },
        {
          id_seuil: THRESHOLD_SPO2_ID,
          type_mesure: MeasurementType.SPO2,
          valeur_min: '88.00',
          valeur_max: '100.00',
        },
      ]);

      const result = await service.evaluateMeasurementsAndCreateAlerts(
        txManager as unknown as EntityManager,
        PATIENT_ID,
        [sampleMeasurement],
      );

      expect(result.createdAlertIds).toEqual([]);
      expect(alertSaveMock).not.toHaveBeenCalled();
    });

    it('crée plusieurs alertes ACTIVE en cas de dépassements bas et haut et peuple recevoir', async () => {
      txManager.query
        .mockResolvedValueOnce([
          {
            id_seuil: THRESHOLD_FC_ID,
            type_mesure: MeasurementType.FREQUENCE_CARDIAQUE,
            valeur_min: '60.00',
            valeur_max: '110.00',
          },
          {
            id_seuil: THRESHOLD_SPO2_ID,
            type_mesure: MeasurementType.SPO2,
            valeur_min: '92.00',
            valeur_max: '100.00',
          },
        ])
        .mockResolvedValue([]);

      const result = await service.evaluateMeasurementsAndCreateAlerts(
        txManager as unknown as EntityManager,
        PATIENT_ID,
        [sampleMeasurement],
      );

      expect(result.createdAlertIds).toHaveLength(2);
      expect(result.recipientCaregiverIds).toEqual([CAREGIVER_ID]);

      const [savedAlerts] = alertSaveMock.mock.calls[0] as [Alert[]];
      expect(savedAlerts).toHaveLength(2);
      expect(savedAlerts[0]).toMatchObject({
        valeurSeuil: '110.00',
        statut: AlertStatus.ACTIVE,
        idMesure: MEASUREMENT_ID,
        idSeuil: THRESHOLD_FC_ID,
      });
      expect(savedAlerts[1]).toMatchObject({
        valeurSeuil: '92.00',
        statut: AlertStatus.ACTIVE,
        idMesure: MEASUREMENT_ID,
        idSeuil: THRESHOLD_SPO2_ID,
      });
    });
  });

  describe('listAlerts', () => {
    it('renvoie 400 si startDate > endDate', async () => {
      await expect(
        service.listAlerts(
          {
            startDate: '2026-11-25T00:00:00Z',
            endDate: '2026-11-20T00:00:00Z',
          },
          caller,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('renvoie 200 avec une liste vide pour un filtre patientId hors périmètre ou non UUID', async () => {
      const page = await service.listAlerts(
        { patientId: 'patient-inexistant' },
        caller,
      );

      expect(page).toEqual({
        items: [],
        page: 0,
        size: 50,
        totalItems: 0,
        totalPages: 0,
        links: {
          self: '/alerts?patientId=patient-inexistant&page=0&size=50',
          next: null,
          prev: null,
        },
      });
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('retourne AlertPage avec AlertSummary sans valeurMesuree ni valeurSeuil', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([
          {
            id_alerte: ALERT_ID,
            id_patient: PATIENT_ID,
            nom: 'Exemple',
            prenom: 'Camille',
            type_mesure: MeasurementType.FREQUENCE_CARDIAQUE,
            horodatage: new Date('2026-11-20T10:00:00Z'),
            statut: AlertStatus.ACTIVE,
          },
        ]);

      const page = await service.listAlerts(
        { status: AlertStatus.ACTIVE, page: 0, size: 50 },
        caller,
      );

      expect(page).toEqual({
        items: [
          {
            alertId: ALERT_ID,
            patientId: PATIENT_ID,
            nomPatient: 'Exemple',
            prenomPatient: 'Camille',
            typeMesure: MeasurementType.FREQUENCE_CARDIAQUE,
            horodatage: '2026-11-20T10:00:00.000Z',
            statut: AlertStatus.ACTIVE,
          },
        ],
        page: 0,
        size: 50,
        totalItems: 1,
        totalPages: 1,
        links: {
          self: '/alerts?status=ACTIVE&page=0&size=50',
          next: null,
          prev: null,
        },
      });
    });
  });

  describe('getAlertDetail', () => {
    it('renvoie 404 si l’alerte est hors périmètre ou inexistante', async () => {
      dataSource.query.mockResolvedValueOnce([]);

      await expect(service.getAlertDetail(ALERT_ID, caller)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retourne AlertDetail sans exposer id_mesure ni id_seuil', async () => {
      dataSource.query.mockResolvedValueOnce([
        {
          id_alerte: ALERT_ID,
          id_patient: PATIENT_ID,
          type_mesure: MeasurementType.FREQUENCE_CARDIAQUE,
          frequence_cardiaque: 125,
          spo2: 98,
          pas: 40,
          valeur_seuil: '110.00',
          statut: AlertStatus.ACTIVE,
          horodatage: new Date('2026-11-20T10:00:00Z'),
        },
      ]);

      const detail = await service.getAlertDetail(ALERT_ID, caller);

      expect(detail).toEqual({
        alertId: ALERT_ID,
        patientId: PATIENT_ID,
        typeMesure: MeasurementType.FREQUENCE_CARDIAQUE,
        valeurMesuree: 125,
        valeurSeuil: 110,
        statut: AlertStatus.ACTIVE,
        horodatage: '2026-11-20T10:00:00.000Z',
      });
    });
  });

  describe('acknowledgeAlert', () => {
    it('renvoie 404 si l’alerte est introuvable ou hors périmètre', async () => {
      txManager.query.mockResolvedValueOnce([]);

      await expect(
        service.acknowledgeAlert(
          ALERT_ID,
          { statut: AlertStatus.TRAITEE },
          caller,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('renvoie 409 si l’alerte est déjà traitée', async () => {
      txManager.query.mockResolvedValueOnce([
        {
          id_alerte: ALERT_ID,
          id_patient: PATIENT_ID,
          type_mesure: MeasurementType.SPO2,
          frequence_cardiaque: 75,
          spo2: 88,
          pas: 20,
          valeur_seuil: '92.00',
          statut: AlertStatus.TRAITEE,
          horodatage: new Date('2026-11-20T10:00:00Z'),
        },
      ]);

      await expect(
        service.acknowledgeAlert(
          ALERT_ID,
          { statut: AlertStatus.TRAITEE },
          caller,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('passe l’alerte de ACTIVE à TRAITEE et retourne AlertDetail mis à jour', async () => {
      txManager.query
        .mockResolvedValueOnce([
          {
            id_alerte: ALERT_ID,
            id_patient: PATIENT_ID,
            type_mesure: MeasurementType.FREQUENCE_CARDIAQUE,
            frequence_cardiaque: 125,
            spo2: 98,
            pas: 40,
            valeur_seuil: '110.00',
            statut: AlertStatus.ACTIVE,
            horodatage: new Date('2026-11-20T10:00:00Z'),
          },
        ])
        .mockResolvedValueOnce([]);

      const updated = await service.acknowledgeAlert(
        ALERT_ID,
        { statut: AlertStatus.TRAITEE },
        caller,
      );

      expect(updated).toEqual({
        alertId: ALERT_ID,
        patientId: PATIENT_ID,
        typeMesure: MeasurementType.FREQUENCE_CARDIAQUE,
        valeurMesuree: 125,
        valeurSeuil: 110,
        statut: AlertStatus.TRAITEE,
        horodatage: '2026-11-20T10:00:00.000Z',
      });
    });
  });
});
