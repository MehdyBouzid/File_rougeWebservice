import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import { Suivre } from '../entities/suivre.entity';

export interface FollowedPatientRow {
  id_patient: string;
  nom: string | null;
  prenom: string | null;
  date_naissance: Date | string | null;
}

export interface FindFollowedPatientsParams {
  caregiverId?: string;
  requireConsent: boolean;
  referenceDate: Date;
  page: number;
  size: number;
}

@Injectable()
export class SuivreRepository {
  constructor(
    @InjectRepository(Suivre)
    private readonly suivreOrmRepository: Repository<Suivre>,
    private readonly dataSource: DataSource,
  ) {}

  async existsFollow(caregiverId: string, patientId: string): Promise<boolean> {
    return this.suivreOrmRepository.existsBy({
      idSoignant: caregiverId,
      idPatient: patientId,
    });
  }

  async findPatientIdsByCaregiver(caregiverId: string): Promise<string[]> {
    const rows = await this.suivreOrmRepository.find({
      where: { idSoignant: caregiverId },
      select: { idPatient: true },
    });
    return rows.map((row) => row.idPatient);
  }

  async findCaregiverIdsByPatient(
    patientId: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    const repo = manager
      ? manager.getRepository(Suivre)
      : this.suivreOrmRepository;
    const rows = await repo.find({
      where: { idPatient: patientId },
      select: { idSoignant: true },
    });
    return rows.map((row) => row.idSoignant);
  }

  async hasValidConsent(
    caregiverId: string,
    patientId: string,
    referenceDate: Date,
  ): Promise<boolean> {
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

  async findCaregiverIdsByPatientWithValidConsent(
    patientId: string,
    referenceDate: Date,
    manager?: EntityManager,
  ): Promise<string[]> {
    const runner = manager ?? this.dataSource.manager;
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

  async findFollowedPatientsPage(
    params: FindFollowedPatientsParams,
  ): Promise<{ rows: FollowedPatientRow[]; totalItems: number }> {
    const { caregiverId, requireConsent, referenceDate, page, size } = params;

    if (caregiverId !== undefined) {
      const queryParams: unknown[] = [caregiverId];
      const consentCondition = requireConsent
        ? `AND EXISTS (
            SELECT 1
            FROM public.consentement c
            WHERE c.id_patient = p.id_patient
              AND c.id_soignant = $1
              AND (c.date_debut IS NULL OR c.date_debut <= $2)
              AND (c.date_fin IS NULL OR c.date_fin > $2)
          )`
        : '';

      if (requireConsent) {
        queryParams.push(referenceDate);
      }

      const baseFrom = `
        FROM public.patient p
        INNER JOIN public.suivre su
          ON su.id_patient = p.id_patient
        WHERE su.id_soignant = $1
          ${consentCondition}
      `;

      const countRows: Array<{ total: string | number }> =
        await this.dataSource.query(
          `SELECT COUNT(*)::int AS total ${baseFrom}`,
          queryParams,
        );
      const totalItems = Number(countRows[0]?.total ?? 0);

      if (totalItems === 0) {
        return { rows: [], totalItems: 0 };
      }

      const limitIdx = queryParams.length + 1;
      const offsetIdx = queryParams.length + 2;
      const rows: FollowedPatientRow[] = await this.dataSource.query(
        `
          SELECT p.id_patient, p.nom, p.prenom, p.date_naissance
          ${baseFrom}
          ORDER BY p.nom ASC NULLS LAST, p.prenom ASC NULLS LAST, p.id_patient ASC
          LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `,
        [...queryParams, size, page * size],
      );

      return { rows, totalItems };
    }

    const baseFrom = `
      FROM public.patient p
      WHERE EXISTS (
        SELECT 1
        FROM public.suivre su
        WHERE su.id_patient = p.id_patient
      )
    `;

    const countRows: Array<{ total: string | number }> =
      await this.dataSource.query(`SELECT COUNT(*)::int AS total ${baseFrom}`);
    const totalItems = Number(countRows[0]?.total ?? 0);

    if (totalItems === 0) {
      return { rows: [], totalItems: 0 };
    }

    const rows: FollowedPatientRow[] = await this.dataSource.query(
      `
        SELECT p.id_patient, p.nom, p.prenom, p.date_naissance
        ${baseFrom}
        ORDER BY p.nom ASC NULLS LAST, p.prenom ASC NULLS LAST, p.id_patient ASC
        LIMIT $1 OFFSET $2
      `,
      [size, page * size],
    );

    return { rows, totalItems };
  }
}
