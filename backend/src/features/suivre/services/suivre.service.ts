import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { buildPaginationLinks } from '../../../common/http/pagination.util';
import { isUuid } from '../../../common/validation/validation.utils';
import type {
  FollowedPatientDto,
  FollowedPatientPageDto,
} from '../dto/followed-patient-response.dto';
import type { ListFollowedPatientsQueryDto } from '../dto/list-followed-patients-query.dto';
import {
  type FollowedPatientRow,
  SuivreRepository,
} from '../repositories/suivre.repository';

export interface SuivreAccessOptions {
  requireConsent?: boolean;
  referenceDate?: Date;
}

export interface SuivreRecipientsOptions {
  onlyWithValidConsent?: boolean;
  manager?: EntityManager;
  referenceDate?: Date;
}

@Injectable()
export class SuivreService {
  constructor(private readonly suivreRepository: SuivreRepository) {}

  async isFollowingPatient(
    caregiverId: string,
    patientId: string,
  ): Promise<boolean> {
    if (!isUuid(caregiverId) || !isUuid(patientId)) {
      return false;
    }
    return this.suivreRepository.existsFollow(caregiverId, patientId);
  }

  async hasValidConsent(
    caregiverId: string,
    patientId: string,
    referenceDate: Date = new Date(),
  ): Promise<boolean> {
    if (!isUuid(caregiverId) || !isUuid(patientId)) {
      return false;
    }
    return this.suivreRepository.hasValidConsent(
      caregiverId,
      patientId,
      referenceDate,
    );
  }

  async canAccessPatient(
    caregiverId: string,
    patientId: string,
    options: SuivreAccessOptions = {},
  ): Promise<boolean> {
    if (!isUuid(caregiverId) || !isUuid(patientId)) {
      return false;
    }

    const isFollowed = await this.suivreRepository.existsFollow(
      caregiverId,
      patientId,
    );
    if (!isFollowed) {
      return false;
    }

    const requireConsent = options.requireConsent ?? true;
    if (!requireConsent) {
      return true;
    }

    return this.suivreRepository.hasValidConsent(
      caregiverId,
      patientId,
      options.referenceDate ?? new Date(),
    );
  }

  async getCaregiversForPatient(
    patientId: string,
    options: SuivreRecipientsOptions = {},
  ): Promise<string[]> {
    if (!isUuid(patientId)) {
      return [];
    }

    const onlyWithValidConsent = options.onlyWithValidConsent ?? true;
    if (!onlyWithValidConsent) {
      return this.suivreRepository.findCaregiverIdsByPatient(
        patientId,
        options.manager,
      );
    }

    return this.suivreRepository.findCaregiverIdsByPatientWithValidConsent(
      patientId,
      options.referenceDate ?? new Date(),
      options.manager,
    );
  }

  async listFollowedPatients(
    query: ListFollowedPatientsQueryDto,
    caregiverId?: string,
    options: SuivreAccessOptions = {},
  ): Promise<FollowedPatientPageDto> {
    const page = query.page ?? 0;
    const size = query.size ?? 50;

    if (caregiverId !== undefined && !isUuid(caregiverId)) {
      return {
        items: [],
        page,
        size,
        totalItems: 0,
        totalPages: 0,
        links: buildPaginationLinks('/patients', page, size, 0),
      };
    }

    const { rows, totalItems } =
      await this.suivreRepository.findFollowedPatientsPage({
        caregiverId,
        requireConsent: options.requireConsent ?? true,
        referenceDate: options.referenceDate ?? new Date(),
        page,
        size,
      });

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / size);

    return {
      items: rows.map((row) => this.mapPatientRow(row)),
      page,
      size,
      totalItems,
      totalPages,
      links: buildPaginationLinks('/patients', page, size, totalPages),
    };
  }

  private mapPatientRow(row: FollowedPatientRow): FollowedPatientDto {
    let dateNaissance: string | null = null;
    if (row.date_naissance instanceof Date) {
      dateNaissance = row.date_naissance.toISOString().slice(0, 10);
    } else if (typeof row.date_naissance === 'string') {
      dateNaissance = row.date_naissance.slice(0, 10);
    }

    return {
      patientId: row.id_patient,
      nom: row.nom ?? '',
      prenom: row.prenom ?? '',
      dateNaissance,
    };
  }
}
