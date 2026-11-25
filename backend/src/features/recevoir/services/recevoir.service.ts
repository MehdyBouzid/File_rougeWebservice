import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { isUuid } from '../../../common/validation/validation.utils';
import { RecevoirRepository } from '../repositories/recevoir.repository';

@Injectable()
export class RecevoirService {
  constructor(private readonly recevoirRepository: RecevoirRepository) {}

  async assignAlertsToCaregivers(
    alertIds: string[],
    caregiverIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    const validAlertIds = alertIds.filter((id) => isUuid(id));
    const validCaregiverIds = caregiverIds.filter((id) => isUuid(id));

    if (validAlertIds.length === 0 || validCaregiverIds.length === 0) {
      return;
    }

    await this.recevoirRepository.linkRecipients(
      validAlertIds,
      validCaregiverIds,
      manager,
    );
  }

  async getRecipientCaregiverIds(alertId: string): Promise<string[]> {
    if (!isUuid(alertId)) {
      return [];
    }
    return this.recevoirRepository.findCaregiverIdsByAlert(alertId);
  }

  async getAlertIdsForCaregiver(caregiverId: string): Promise<string[]> {
    if (!isUuid(caregiverId)) {
      return [];
    }
    return this.recevoirRepository.findAlertIdsByCaregiver(caregiverId);
  }

  async hasCaregiverReceivedAlert(
    caregiverId: string,
    alertId: string,
  ): Promise<boolean> {
    if (!isUuid(caregiverId) || !isUuid(alertId)) {
      return false;
    }
    return this.recevoirRepository.isCaregiverRecipient(caregiverId, alertId);
  }
}
