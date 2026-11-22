import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { buildPaginationLinks } from '../../../common/http/pagination.util';
import {
  isUuid,
  parseAndValidateDateRange,
} from '../../../common/validation/validation.utils';
import { AlertsService } from '../../alerts/services/alerts.service';
import { CaregiversService } from '../../caregivers/services/caregivers.service';
import type { ListMeasurementsQueryDto } from '../dto/list-measurements-query.dto';
import type { MeasurementBatchDto } from '../dto/measurement-batch.dto';
import type {
  BatchReceiptDto,
  MeasurementPageDto,
} from '../dto/measurement-response.dto';
import { MeasurementBatch } from '../entities/measurement-batch.entity';
import { Measurement } from '../entities/measurement.entity';

function isUniqueViolationError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as {
    code?: unknown;
    driverError?: { code?: unknown };
  };
  return candidate.code === '23505' || candidate.driverError?.code === '23505';
}

@Injectable()
export class MeasurementsService {
  constructor(
    @InjectRepository(Measurement)
    private readonly measurementsRepository: Repository<Measurement>,
    private readonly dataSource: DataSource,
    private readonly caregiversService: CaregiversService,
    private readonly alertsService: AlertsService,
  ) {}

  async ingestBatch(dto: MeasurementBatchDto): Promise<BatchReceiptDto> {
    if (!isUuid(dto.patientId)) {
      throw new NotFoundException('Patient introuvable.');
    }

    const { receipt, alertResult } = await this.dataSource.transaction(
      async (manager) => {
        const patientRows: Array<{ id_patient: string }> = await manager.query(
          `
            SELECT id_patient
            FROM public.patient
            WHERE id_patient = $1
            LIMIT 1
          `,
          [dto.patientId],
        );

        if (patientRows.length === 0) {
          throw new NotFoundException('Patient introuvable.');
        }

        try {
          await manager.getRepository(MeasurementBatch).insert({
            batchId: dto.batchId,
            idPatient: dto.patientId,
          });
        } catch (error) {
          if (isUniqueViolationError(error)) {
            throw new ConflictException(
              'Ce lot de mesures a déjà été enregistré.',
            );
          }
          throw error;
        }

        const measurementRepo = manager.getRepository(Measurement);
        const entities = dto.measurements.map((item) =>
          measurementRepo.create({
            idMesure: randomUUID(),
            horodatage: new Date(item.horodatage),
            frequenceCardiaque: item.frequenceCardiaque,
            spo2: item.spo2,
            pas: item.pas,
            idPatient: dto.patientId,
          }),
        );

        const savedMeasurements = await measurementRepo.save(entities);

        const evaluation =
          await this.alertsService.evaluateMeasurementsAndCreateAlerts(
            manager,
            dto.patientId,
            savedMeasurements,
          );

        return {
          receipt: {
            batchId: dto.batchId,
            patientId: dto.patientId,
            count: savedMeasurements.length,
          } satisfies BatchReceiptDto,
          alertResult: evaluation,
        };
      },
    );

    if (alertResult.createdAlertIds.length > 0) {
      this.alertsService.notifyCaregiversOfNewAlerts(
        alertResult.recipientCaregiverIds,
        alertResult.createdAlertIds.length,
      );
    }

    return receipt;
  }

  async listPatientMeasurements(
    patientId: string,
    query: ListMeasurementsQueryDto,
    caregiverId?: string,
  ): Promise<MeasurementPageDto> {
    const { start, end } = parseAndValidateDateRange(
      query.startDate,
      query.endDate,
    );

    if (!isUuid(patientId)) {
      throw new NotFoundException('Patient introuvable.');
    }

    if (caregiverId !== undefined) {
      const hasAccess = await this.caregiversService.hasAccessToPatient(
        caregiverId,
        patientId,
        { requireConsent: true },
      );
      if (!hasAccess) {
        throw new NotFoundException('Patient introuvable.');
      }
    } else {
      const patientRows: Array<{ id_patient: string }> =
        await this.dataSource.query(
          `
            SELECT id_patient
            FROM public.patient
            WHERE id_patient = $1
            LIMIT 1
          `,
          [patientId],
        );
      if (patientRows.length === 0) {
        throw new NotFoundException('Patient introuvable.');
      }
    }

    const page = query.page ?? 0;
    const size = query.size ?? 50;

    const qb = this.measurementsRepository
      .createQueryBuilder('m')
      .where('m.idPatient = :patientId', { patientId });

    if (start) {
      qb.andWhere('m.horodatage >= :start', { start });
    }
    if (end) {
      qb.andWhere('m.horodatage <= :end', { end });
    }

    const [rows, totalItems] = await qb
      .orderBy('m.horodatage', 'DESC')
      .addOrderBy('m.idMesure', 'ASC')
      .skip(page * size)
      .take(size)
      .getManyAndCount();

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / size);
    const links = buildPaginationLinks(
      `/patients/${encodeURIComponent(patientId)}/measurements`,
      page,
      size,
      totalPages,
      {
        startDate: query.startDate,
        endDate: query.endDate,
      },
    );

    return {
      items: rows.map((row) => ({
        horodatage:
          row.horodatage instanceof Date
            ? row.horodatage.toISOString()
            : new Date(row.horodatage).toISOString(),
        frequenceCardiaque: row.frequenceCardiaque,
        spo2: row.spo2,
        pas: row.pas,
      })),
      page,
      size,
      totalItems,
      totalPages,
      links,
    };
  }
}
