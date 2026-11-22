import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import { buildPaginationLinks } from '../../../common/http/pagination.util';
import { MeasurementType } from '../../../common/types/measurement-type.enum';
import {
  isUuid,
  parseAndValidateDateRange,
} from '../../../common/validation/validation.utils';
import { CaregiversService } from '../../caregivers/services/caregivers.service';
import type { Measurement } from '../../measurements/entities/measurement.entity';
import type {
  AlertDetailDto,
  AlertPageDto,
  AlertSummaryDto,
} from '../dto/alert-response.dto';
import type { AlertUpdateDto } from '../dto/alert-update.dto';
import type { ListAlertsQueryDto } from '../dto/list-alerts-query.dto';
import { Alert, AlertStatus } from '../entities/alert.entity';

interface ActiveThresholdRow {
  id_seuil: string;
  type_mesure: MeasurementType;
  valeur_min: string | number;
  valeur_max: string | number;
}

interface AlertSummaryRow {
  id_alerte: string;
  id_patient: string;
  nom: string | null;
  prenom: string | null;
  type_mesure: MeasurementType;
  horodatage: Date | string;
  statut: AlertStatus;
}

interface AlertDetailRow {
  id_alerte: string;
  id_patient: string;
  type_mesure: MeasurementType;
  frequence_cardiaque: number;
  spo2: number;
  pas: number;
  valeur_seuil: string | number;
  statut: AlertStatus;
  horodatage: Date | string;
}

export interface ThresholdEvaluationResult {
  createdAlertIds: string[];
  recipientCaregiverIds: string[];
}

const GENERIC_PUSH_MESSAGE =
  'Une nouvelle alerte nécessite votre attention. Connectez-vous à Veillo pour la consulter.';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,
    private readonly dataSource: DataSource,
    private readonly caregiversService: CaregiversService,
  ) {}

  async evaluateMeasurementsAndCreateAlerts(
    manager: EntityManager,
    patientId: string,
    measurements: Measurement[],
  ): Promise<ThresholdEvaluationResult> {
    if (measurements.length === 0) {
      return { createdAlertIds: [], recipientCaregiverIds: [] };
    }

    const activeThresholds: ActiveThresholdRow[] = await manager.query(
      `
        SELECT id_seuil, type_mesure, valeur_min, valeur_max
        FROM public.seuil
        WHERE id_patient = $1
          AND actif = TRUE
      `,
      [patientId],
    );

    if (activeThresholds.length === 0) {
      return { createdAlertIds: [], recipientCaregiverIds: [] };
    }

    const alertsToCreate: Alert[] = [];
    const createdAt = new Date();

    for (const measurement of measurements) {
      for (const threshold of activeThresholds) {
        const measuredValue = this.extractMeasurementValue(
          measurement,
          threshold.type_mesure,
        );
        const min = Number(threshold.valeur_min);
        const max = Number(threshold.valeur_max);

        let breachedBound: number | null = null;
        if (measuredValue < min) {
          breachedBound = min;
        } else if (measuredValue > max) {
          breachedBound = max;
        }

        if (breachedBound !== null) {
          const alert = manager.getRepository(Alert).create({
            idAlerte: randomUUID(),
            horodatage: createdAt,
            valeurSeuil: breachedBound.toFixed(2),
            statut: AlertStatus.ACTIVE,
            idMesure: measurement.idMesure,
            idSeuil: threshold.id_seuil,
          });
          alertsToCreate.push(alert);
        }
      }
    }

    if (alertsToCreate.length === 0) {
      return { createdAlertIds: [], recipientCaregiverIds: [] };
    }

    await manager.getRepository(Alert).save(alertsToCreate);

    const recipientCaregiverIds =
      await this.caregiversService.getCaregiversForPatient(patientId, {
        onlyWithValidConsent: true,
        manager,
        referenceDate: createdAt,
      });

    if (recipientCaregiverIds.length > 0) {
      for (const alert of alertsToCreate) {
        for (const caregiverId of recipientCaregiverIds) {
          await manager.query(
            `
              INSERT INTO public.recevoir (id_soignant, id_alerte)
              VALUES ($1, $2)
              ON CONFLICT (id_soignant, id_alerte) DO NOTHING
            `,
            [caregiverId, alert.idAlerte],
          );
        }
      }
    }

    return {
      createdAlertIds: alertsToCreate.map((alert) => alert.idAlerte),
      recipientCaregiverIds,
    };
  }

  notifyCaregiversOfNewAlerts(
    recipientCaregiverIds: string[],
    alertsCount: number,
  ): void {
    if (alertsCount <= 0 || recipientCaregiverIds.length === 0) {
      return;
    }
    // Message strictement générique : aucune donnée de santé ni identité patient dans les notifications ou logs.
    this.logger.log(
      `Notification push générique préparée (${alertsCount} alerte(s), ${recipientCaregiverIds.length} destinataire(s)) : "${GENERIC_PUSH_MESSAGE}"`,
    );
  }

  async listAlerts(
    query: ListAlertsQueryDto,
    caregiverId?: string,
  ): Promise<AlertPageDto> {
    const { start, end } = parseAndValidateDateRange(
      query.startDate,
      query.endDate,
    );
    const page = query.page ?? 0;
    const size = query.size ?? 50;
    const filters = {
      patientId: query.patientId,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    };
    const emptyPage = (): AlertPageDto => ({
      items: [],
      page,
      size,
      totalItems: 0,
      totalPages: 0,
      links: buildPaginationLinks('/alerts', page, size, 0, filters),
    });

    if (caregiverId !== undefined && !isUuid(caregiverId)) {
      return emptyPage();
    }

    // Un filtre patientId inexistant ou invalide renvoie une liste vide en 200 (jamais 403 ni 404).
    if (query.patientId && !isUuid(query.patientId)) {
      return emptyPage();
    }

    const params: unknown[] = [];
    const conditions: string[] = [];
    let caregiverJoin = '';

    if (caregiverId !== undefined) {
      const referenceDate = new Date();
      params.push(caregiverId, referenceDate);
      caregiverJoin =
        'INNER JOIN public.suivre su ON su.id_patient = p.id_patient';
      conditions.push(
        'su.id_soignant = $1',
        `EXISTS (
          SELECT 1
          FROM public.consentement c
          WHERE c.id_patient = p.id_patient
            AND c.id_soignant = $1
            AND (c.date_debut IS NULL OR c.date_debut <= $2)
            AND (c.date_fin IS NULL OR c.date_fin > $2)
        )`,
      );
    }

    if (query.patientId) {
      params.push(query.patientId);
      conditions.push(`p.id_patient = $${params.length}`);
    }

    if (query.status) {
      params.push(query.status);
      conditions.push(`a.statut = $${params.length}`);
    }

    if (start) {
      params.push(start);
      conditions.push(`a.horodatage >= $${params.length}`);
    }

    if (end) {
      params.push(end);
      conditions.push(`a.horodatage <= $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const baseFrom = `
      FROM public.alerte a
      INNER JOIN public.mesure m ON m.id_mesure = a.id_mesure
      INNER JOIN public.seuil s ON s.id_seuil = a.id_seuil
      INNER JOIN public.patient p ON p.id_patient = m.id_patient
      ${caregiverJoin}
      ${whereClause}
    `;

    const countRows: Array<{ total: string | number }> =
      await this.dataSource.query(
        `SELECT COUNT(*)::int AS total ${baseFrom}`,
        params,
      );
    const totalItems = Number(countRows[0]?.total ?? 0);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / size);

    if (totalItems === 0) {
      return emptyPage();
    }

    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    const rows: AlertSummaryRow[] = await this.dataSource.query(
      `
        SELECT
          a.id_alerte,
          p.id_patient,
          p.nom,
          p.prenom,
          s.type_mesure,
          a.horodatage,
          a.statut
        ${baseFrom}
        ORDER BY a.horodatage DESC, a.id_alerte ASC
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
      `,
      [...params, size, page * size],
    );

    const items: AlertSummaryDto[] = rows.map((row) => ({
      alertId: row.id_alerte,
      patientId: row.id_patient,
      nomPatient: row.nom ?? '',
      prenomPatient: row.prenom ?? '',
      typeMesure: row.type_mesure,
      horodatage: this.toIsoString(row.horodatage),
      statut: row.statut,
    }));

    return {
      items,
      page,
      size,
      totalItems,
      totalPages,
      links: buildPaginationLinks('/alerts', page, size, totalPages, filters),
    };
  }

  async getAlertDetail(
    alertId: string,
    caregiverId?: string,
  ): Promise<AlertDetailDto> {
    if (
      !isUuid(alertId) ||
      (caregiverId !== undefined && !isUuid(caregiverId))
    ) {
      throw new NotFoundException('Alerte introuvable.');
    }

    const rows =
      caregiverId !== undefined
        ? await this.dataSource.query<AlertDetailRow[]>(
            `
              SELECT
                a.id_alerte,
                m.id_patient,
                s.type_mesure,
                m.frequence_cardiaque,
                m.spo2,
                m.pas,
                a.valeur_seuil,
                a.statut,
                a.horodatage
              FROM public.alerte a
              INNER JOIN public.mesure m ON m.id_mesure = a.id_mesure
              INNER JOIN public.seuil s ON s.id_seuil = a.id_seuil
              INNER JOIN public.suivre su ON su.id_patient = m.id_patient
              WHERE a.id_alerte = $1
                AND su.id_soignant = $2
                AND EXISTS (
                  SELECT 1
                  FROM public.consentement c
                  WHERE c.id_patient = m.id_patient
                    AND c.id_soignant = $2
                    AND (c.date_debut IS NULL OR c.date_debut <= $3)
                    AND (c.date_fin IS NULL OR c.date_fin > $3)
                )
              LIMIT 1
            `,
            [alertId, caregiverId, new Date()],
          )
        : await this.dataSource.query<AlertDetailRow[]>(
            `
              SELECT
                a.id_alerte,
                m.id_patient,
                s.type_mesure,
                m.frequence_cardiaque,
                m.spo2,
                m.pas,
                a.valeur_seuil,
                a.statut,
                a.horodatage
              FROM public.alerte a
              INNER JOIN public.mesure m ON m.id_mesure = a.id_mesure
              INNER JOIN public.seuil s ON s.id_seuil = a.id_seuil
              WHERE a.id_alerte = $1
              LIMIT 1
            `,
            [alertId],
          );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Alerte introuvable.');
    }

    return this.mapDetailRow(row);
  }

  async acknowledgeAlert(
    alertId: string,
    dto: AlertUpdateDto,
    caregiverId?: string,
  ): Promise<AlertDetailDto> {
    if (
      !isUuid(alertId) ||
      (caregiverId !== undefined && !isUuid(caregiverId))
    ) {
      throw new NotFoundException('Alerte introuvable.');
    }

    return this.dataSource.transaction(async (manager) => {
      const rows =
        caregiverId !== undefined
          ? await manager.query<AlertDetailRow[]>(
              `
                SELECT
                  a.id_alerte,
                  m.id_patient,
                  s.type_mesure,
                  m.frequence_cardiaque,
                  m.spo2,
                  m.pas,
                  a.valeur_seuil,
                  a.statut,
                  a.horodatage
                FROM public.alerte a
                INNER JOIN public.mesure m ON m.id_mesure = a.id_mesure
                INNER JOIN public.seuil s ON s.id_seuil = a.id_seuil
                INNER JOIN public.suivre su ON su.id_patient = m.id_patient
                WHERE a.id_alerte = $1
                  AND su.id_soignant = $2
                  AND EXISTS (
                    SELECT 1
                    FROM public.consentement c
                    WHERE c.id_patient = m.id_patient
                      AND c.id_soignant = $2
                      AND (c.date_debut IS NULL OR c.date_debut <= $3)
                      AND (c.date_fin IS NULL OR c.date_fin > $3)
                  )
                FOR UPDATE OF a
              `,
              [alertId, caregiverId, new Date()],
            )
          : await manager.query<AlertDetailRow[]>(
              `
                SELECT
                  a.id_alerte,
                  m.id_patient,
                  s.type_mesure,
                  m.frequence_cardiaque,
                  m.spo2,
                  m.pas,
                  a.valeur_seuil,
                  a.statut,
                  a.horodatage
                FROM public.alerte a
                INNER JOIN public.mesure m ON m.id_mesure = a.id_mesure
                INNER JOIN public.seuil s ON s.id_seuil = a.id_seuil
                WHERE a.id_alerte = $1
                FOR UPDATE OF a
              `,
              [alertId],
            );

      const row = rows[0];
      if (!row) {
        throw new NotFoundException('Alerte introuvable.');
      }

      if (row.statut === AlertStatus.TRAITEE) {
        throw new ConflictException(
          "L'alerte est déjà traitée et ne peut pas être modifiée.",
        );
      }

      await manager.query(
        `
          UPDATE public.alerte
          SET statut = $1
          WHERE id_alerte = $2
        `,
        [dto.statut, alertId],
      );

      return this.mapDetailRow({
        ...row,
        statut: dto.statut,
      });
    });
  }

  private extractMeasurementValue(
    measurement: Pick<Measurement, 'frequenceCardiaque' | 'spo2' | 'pas'>,
    typeMesure: MeasurementType,
  ): number {
    switch (typeMesure) {
      case MeasurementType.FREQUENCE_CARDIAQUE:
        return measurement.frequenceCardiaque;
      case MeasurementType.SPO2:
        return measurement.spo2;
      case MeasurementType.PAS:
        return measurement.pas;
    }
  }

  private mapDetailRow(row: AlertDetailRow): AlertDetailDto {
    const valeurMesuree = this.extractMeasurementValue(
      {
        frequenceCardiaque: Number(row.frequence_cardiaque),
        spo2: Number(row.spo2),
        pas: Number(row.pas),
      },
      row.type_mesure,
    );

    return {
      alertId: row.id_alerte,
      patientId: row.id_patient,
      typeMesure: row.type_mesure,
      valeurMesuree,
      valeurSeuil: Number(row.valeur_seuil),
      statut: row.statut,
      horodatage: this.toIsoString(row.horodatage),
    };
  }

  private toIsoString(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
