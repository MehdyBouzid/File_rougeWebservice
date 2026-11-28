import { BadRequestException } from '@nestjs/common';
import { createGlobalValidationPipe } from '../../../../../src/validation.pipe';
import { AlertStatus } from '../../../../../src/features/alerts/entities/alert.entity';
import { AlertUpdateDto } from '../../../../../src/features/alerts/dto/alert-update.dto';
import { ListAlertsQueryDto } from '../../../../../src/features/alerts/dto/list-alerts-query.dto';

describe('DTOs Alertes — validation', () => {
  const pipe = createGlobalValidationPipe();

  it('accepte { statut: "TRAITEE" } pour AlertUpdateDto', async () => {
    const result = (await pipe.transform(
      { statut: AlertStatus.TRAITEE },
      { type: 'body', metatype: AlertUpdateDto },
    )) as AlertUpdateDto;

    expect(result.statut).toBe(AlertStatus.TRAITEE);
  });

  it('rejette un statut autre que TRAITEE ou un champ inconnu', async () => {
    await expect(
      pipe.transform(
        { statut: AlertStatus.ACTIVE },
        { type: 'body', metatype: AlertUpdateDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform({}, { type: 'body', metatype: AlertUpdateDto }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { statut: AlertStatus.TRAITEE, extra: true },
        { type: 'body', metatype: AlertUpdateDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('valide les filtres de ListAlertsQueryDto et refuse size > 100 ou status invalide', async () => {
    const valid = (await pipe.transform(
      {
        status: AlertStatus.ACTIVE,
        page: '0',
        size: '25',
      },
      { type: 'query', metatype: ListAlertsQueryDto },
    )) as ListAlertsQueryDto;

    expect(valid.status).toBe(AlertStatus.ACTIVE);
    expect(valid.page).toBe(0);
    expect(valid.size).toBe(25);

    await expect(
      pipe.transform(
        { status: 'INCONNU' },
        { type: 'query', metatype: ListAlertsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { size: '101' },
        { type: 'query', metatype: ListAlertsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
