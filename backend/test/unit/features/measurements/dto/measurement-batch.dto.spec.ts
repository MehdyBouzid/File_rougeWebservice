import { BadRequestException } from '@nestjs/common';
import { createGlobalValidationPipe } from '../../../../../src/validation.pipe';
import { ListMeasurementsQueryDto } from '../../../../../src/features/measurements/dto/list-measurements-query.dto';
import { MeasurementBatchDto } from '../../../../../src/features/measurements/dto/measurement-batch.dto';

describe('DTOs Mesures — validation', () => {
  const pipe = createGlobalValidationPipe();

  it('accepte un lot valide', async () => {
    const result = (await pipe.transform(
      {
        patientId: '22222222-2222-4222-8222-222222222222',
        batchId: 'lot-001',
        measurements: [
          {
            horodatage: '2026-11-19T10:00:00Z',
            frequenceCardiaque: 75,
            spo2: 98,
            pas: 120,
          },
        ],
      },
      { type: 'body', metatype: MeasurementBatchDto },
    )) as MeasurementBatchDto;

    expect(result).toBeInstanceOf(MeasurementBatchDto);
    expect(result.measurements).toHaveLength(1);
  });

  it('rejette un tableau measurements vide', async () => {
    await expect(
      pipe.transform(
        {
          patientId: '22222222-2222-4222-8222-222222222222',
          batchId: 'lot-001',
          measurements: [],
        },
        { type: 'body', metatype: MeasurementBatchDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejette le lot entier si un seul relevé est invalide (date inexistante ou spo2 > 100)', async () => {
    await expect(
      pipe.transform(
        {
          patientId: '22222222-2222-4222-8222-222222222222',
          batchId: 'lot-002',
          measurements: [
            {
              horodatage: '2026-11-19T10:00:00Z',
              frequenceCardiaque: 75,
              spo2: 98,
              pas: 120,
            },
            {
              horodatage: '2026-02-30T10:01:00Z',
              frequenceCardiaque: 75,
              spo2: 98,
              pas: 10,
            },
          ],
        },
        { type: 'body', metatype: MeasurementBatchDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        {
          patientId: '22222222-2222-4222-8222-222222222222',
          batchId: 'lot-003',
          measurements: [
            {
              horodatage: '2026-11-19T10:00:00Z',
              frequenceCardiaque: 75,
              spo2: 105,
              pas: 120,
            },
          ],
        },
        { type: 'body', metatype: MeasurementBatchDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('valide les paramètres de pagination et rejette size > 100 ou décimal', async () => {
    const valid = (await pipe.transform(
      {
        startDate: '2026-10-01T00:00:00Z',
        endDate: '2026-10-31T00:00:00Z',
        page: '0',
        size: '50',
      },
      { type: 'query', metatype: ListMeasurementsQueryDto },
    )) as ListMeasurementsQueryDto;

    expect(valid.page).toBe(0);
    expect(valid.size).toBe(50);

    await expect(
      pipe.transform(
        { size: '101' },
        { type: 'query', metatype: ListMeasurementsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { page: '1.5' },
        { type: 'query', metatype: ListMeasurementsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
