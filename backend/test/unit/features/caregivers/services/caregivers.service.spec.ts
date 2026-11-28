import type { DataSource, Repository } from 'typeorm';
import type { Caregiver } from '../../../../../src/features/caregivers/entities/caregiver.entity';
import { CaregiversService } from '../../../../../src/features/caregivers/services/caregivers.service';

const CAREGIVER_ID = '11111111-1111-4111-8111-111111111111';
const PATIENT_ID = '22222222-2222-4222-8222-222222222222';

describe('CaregiversService', () => {
  let service: CaregiversService;
  let repository: { findOne: jest.Mock };
  let dataSource: { query: jest.Mock; manager: { query: jest.Mock } };

  beforeEach(() => {
    repository = { findOne: jest.fn() };
    dataSource = {
      query: jest.fn(),
      manager: { query: jest.fn() },
    };
    service = new CaregiversService(
      repository as unknown as Repository<Caregiver>,
      dataSource as unknown as DataSource,
    );
  });

  it('retourne null sans requêter la base pour un UUID soignant invalide', async () => {
    await expect(service.findById('not-a-uuid')).resolves.toBeNull();
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('vérifie le suivi et le consentement valide dans hasAccessToPatient', async () => {
    dataSource.query.mockResolvedValueOnce([{ exists: 1 }]);

    const allowed = await service.hasAccessToPatient(CAREGIVER_ID, PATIENT_ID);

    expect(allowed).toBe(true);
    expect(dataSource.query).toHaveBeenCalledTimes(1);
    const [sql, params] = dataSource.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('public.suivre');
    expect(sql).toContain('public.consentement');
    expect(params[0]).toBe(PATIENT_ID);
    expect(params[1]).toBe(CAREGIVER_ID);
  });

  it('retourne false sans requêter la base si patientId est invalide', async () => {
    await expect(
      service.hasAccessToPatient(CAREGIVER_ID, 'patient-001'),
    ).resolves.toBe(false);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('retourne la liste des soignants avec consentement valide pour un patient', async () => {
    dataSource.manager.query.mockResolvedValueOnce([
      { id_soignant: CAREGIVER_ID },
    ]);

    const ids = await service.getCaregiversForPatient(PATIENT_ID);

    expect(ids).toEqual([CAREGIVER_ID]);
    expect(dataSource.manager.query).toHaveBeenCalledTimes(1);
  });
});
