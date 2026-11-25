import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, Repository } from 'typeorm';
import { isUuid } from '../../../common/validation/validation.utils';
import { SuivreService } from '../../suivre/services/suivre.service';
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
    private readonly suivreService: SuivreService,
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
    return this.suivreService.isFollowingPatient(caregiverId, patientId);
  }

  async hasValidConsent(
    caregiverId: string,
    patientId: string,
    referenceDate: Date = new Date(),
  ): Promise<boolean> {
    return this.suivreService.hasValidConsent(
      caregiverId,
      patientId,
      referenceDate,
    );
  }

  async hasAccessToPatient(
    caregiverId: string,
    patientId: string,
    options: PatientAccessOptions = {},
  ): Promise<boolean> {
    return this.suivreService.canAccessPatient(caregiverId, patientId, options);
  }

  async getCaregiversForPatient(
    patientId: string,
    options: PatientCaregiversOptions = {},
  ): Promise<string[]> {
    return this.suivreService.getCaregiversForPatient(patientId, options);
  }
}
