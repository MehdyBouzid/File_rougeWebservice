import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import { isUuid } from '../../../common/validation/validation.utils';
import { Caregiver } from '../entities/caregiver.entity';

export interface PatientAccessOptions {
  requireConsent?: boolean;
  referenceDate?: Date;
}

export interface PatientCaregiversOptions {
  onlyWithValidConsent?: boolean;
  manager?: EntityManager;
  referenceDate?: Date;
}

@Injectable()
export class CaregiversService {
  constructor(
    @InjectRepository(Caregiver)
    private readonly caregiversRepository: Repository<Caregiver>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(caregiverId: string): Promise<Caregiver | null> {
    if (!isUuid(caregiverId)) {
      return null;
    }
    return this.caregiversRepository.findOne({
      where: { idSoignant: caregiverId },
    });
  }

  async isFollowingPatient(
    caregiverId: string,
    patientId: string,
  ): Promise<boolean> {
    if (!isUuid(caregiverId) || !isUuid(patientId)) {
      return false;
    }

    const rows: Array<{ exists: number }> = await this.dataSource.query(
      `
        SELECT 1 AS exists
        FROM public.suivre
        WHERE id_soignant = $1
          AND id_patient = $2
        LIMIT 1
      `,
      [caregiverId, patientId],
    );

    return rows.length > 0;
  }

  async hasValidConsent(
    caregiverId: string,
    patientId: string,
    referenceDate: Date = new Date(),
  ): Promise<boolean> {
    if (!isUuid(caregiverId) || !isUuid(patientId)) {
      return false;
    }

    const rows: Array<{ exists: number }> = await this.dataSource.query(
      `
        SELECT 1 AS exists
        FROM public.consentement
        WHERE id_soignant = $1
          AND id_patient = $2
          AND (date_debut IS NULL OR date_debut <= $3)
          AND (date_fin IS NULL OR date_fin > $3)
        LIMIT 1
      `,
      [caregiverId, patientId, referenceDate],
    );

    return rows.length > 0;
  }

  async hasAccessToPatient(
    caregiverId: string,
    patientId: string,
    options: PatientAccessOptions = {},
  ): Promise<boolean> {
    if (!isUuid(caregiverId) || !isUuid(patientId)) {
      return false;
    }

    const requireConsent = options.requireConsent ?? true;
    const referenceDate = options.referenceDate ?? new Date();

    if (!requireConsent) {
      const rows: Array<{ exists: number }> = await this.dataSource.query(
        `
          SELECT 1 AS exists
          FROM public.patient p
          INNER JOIN public.suivre su
            ON su.id_patient = p.id_patient
          WHERE p.id_patient = $1
            AND su.id_soignant = $2
          LIMIT 1
        `,
        [patientId, caregiverId],
      );
      return rows.length > 0;
    }

    const rows: Array<{ exists: number }> = await this.dataSource.query(
      `
        SELECT 1 AS exists
        FROM public.patient p
        INNER JOIN public.suivre su
          ON su.id_patient = p.id_patient
        WHERE p.id_patient = $1
          AND su.id_soignant = $2
          AND EXISTS (
            SELECT 1
            FROM public.consentement c
            WHERE c.id_patient = p.id_patient
              AND c.id_soignant = su.id_soignant
              AND (c.date_debut IS NULL OR c.date_debut <= $3)
              AND (c.date_fin IS NULL OR c.date_fin > $3)
          )
        LIMIT 1
      `,
      [patientId, caregiverId, referenceDate],
    );

    return rows.length > 0;
  }

  async getCaregiversForPatient(
    patientId: string,
    options: PatientCaregiversOptions = {},
  ): Promise<string[]> {
    if (!isUuid(patientId)) {
      return [];
    }

    const runner = options.manager ?? this.dataSource.manager;
    const onlyWithValidConsent = options.onlyWithValidConsent ?? true;
    const referenceDate = options.referenceDate ?? new Date();

    if (!onlyWithValidConsent) {
      const rows: Array<{ id_soignant: string }> = await runner.query(
        `
          SELECT su.id_soignant
          FROM public.suivre su
          WHERE su.id_patient = $1
        `,
        [patientId],
      );
      return rows.map((row) => row.id_soignant);
    }

    const rows: Array<{ id_soignant: string }> = await runner.query(
      `
        SELECT DISTINCT su.id_soignant
        FROM public.suivre su
        WHERE su.id_patient = $1
          AND EXISTS (
            SELECT 1
            FROM public.consentement c
            WHERE c.id_patient = su.id_patient
              AND c.id_soignant = su.id_soignant
              AND (c.date_debut IS NULL OR c.date_debut <= $2)
              AND (c.date_fin IS NULL OR c.date_fin > $2)
          )
      `,
      [patientId, referenceDate],
    );

    return rows.map((row) => row.id_soignant);
  }
}
