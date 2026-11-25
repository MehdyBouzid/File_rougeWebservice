import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, Repository } from 'typeorm';
import { Recevoir } from '../entities/recevoir.entity';

@Injectable()
export class RecevoirRepository {
  constructor(
    @InjectRepository(Recevoir)
    private readonly recevoirOrmRepository: Repository<Recevoir>,
  ) {}

  async linkRecipients(
    alertIds: string[],
    caregiverIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    if (alertIds.length === 0 || caregiverIds.length === 0) {
      return;
    }

    const repo = manager
      ? manager.getRepository(Recevoir)
      : this.recevoirOrmRepository;

    const values: Array<{ idSoignant: string; idAlerte: string }> = [];
    for (const idAlerte of alertIds) {
      for (const idSoignant of caregiverIds) {
        values.push({ idSoignant, idAlerte });
      }
    }

    await repo
      .createQueryBuilder()
      .insert()
      .into(Recevoir)
      .values(values)
      .orIgnore()
      .execute();
  }

  async findCaregiverIdsByAlert(alertId: string): Promise<string[]> {
    const rows = await this.recevoirOrmRepository.find({
      where: { idAlerte: alertId },
      select: { idSoignant: true },
    });
    return rows.map((row) => row.idSoignant);
  }

  async findAlertIdsByCaregiver(caregiverId: string): Promise<string[]> {
    const rows = await this.recevoirOrmRepository.find({
      where: { idSoignant: caregiverId },
      select: { idAlerte: true },
    });
    return rows.map((row) => row.idAlerte);
  }

  async isCaregiverRecipient(
    caregiverId: string,
    alertId: string,
  ): Promise<boolean> {
    return this.recevoirOrmRepository.existsBy({
      idSoignant: caregiverId,
      idAlerte: alertId,
    });
  }
}
