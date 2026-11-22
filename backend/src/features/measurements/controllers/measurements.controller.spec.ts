import type { Response } from 'express';
import type { AuthenticatedCaller } from '../../../common/auth/caller.types';
import type { MeasurementsService } from '../services/measurements.service';
import { MeasurementsController } from './measurements.controller';

describe('MeasurementsController', () => {
  it('définit l’en-tête Location lors de POST /measurements', async () => {
    const receipt = {
      batchId: 'lot-001',
      patientId: '22222222-2222-4222-8222-222222222222',
      count: 1,
    };
    const service = {
      ingestBatch: jest.fn().mockResolvedValue(receipt),
      listPatientMeasurements: jest.fn(),
    } as unknown as MeasurementsService;

    const controller = new MeasurementsController(service);
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;
    const caller: AuthenticatedCaller = {
      id: 'simulator',
      scopes: ['montre'],
    };

    const result = await controller.ingestMeasurements(
      {
        patientId: receipt.patientId,
        batchId: receipt.batchId,
        measurements: [
          {
            horodatage: '2026-11-19T10:00:00Z',
            frequenceCardiaque: 75,
            spo2: 98,
            pas: 120,
          },
        ],
      },
      caller,
      response,
    );

    expect(result).toEqual(receipt);
    expect(setHeader).toHaveBeenCalledWith('Location', '/measurements/lot-001');
  });
});
