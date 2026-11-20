import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWatchState,
  generateMeasurementBatch,
  nextWatchMeasurement,
} from './simulate-iot.mjs';

test('genere des mesures dans des bornes coherentes', () => {
  const state = createWatchState(1);
  const timestamp = new Date('2026-11-20T10:00:00Z');

  for (let index = 0; index < 100; index += 1) {
    const measurement = nextWatchMeasurement(state, timestamp);
    assert.ok(measurement.frequenceCardiaque >= 45);
    assert.ok(measurement.frequenceCardiaque <= 180);
    assert.ok(measurement.spo2 >= 92);
    assert.ok(measurement.spo2 <= 100);
    assert.ok(Number.isInteger(measurement.pas));
    assert.ok(measurement.pas >= 0);
    assert.ok(measurement.pas <= 120);
    assert.equal(measurement.horodatage, timestamp.toISOString());
  }
});

test('genere un lot conforme au contrat avec un batchId unique', () => {
  generateMeasurementBatch.states = [];
  const batch = generateMeasurementBatch(
    'patient-001',
    0,
    new Date('2026-11-20T10:00:00Z'),
  );

  assert.equal(batch.patientId, 'patient-001');
  assert.match(batch.batchId, /^lot-[0-9a-f-]{36}$/);
  assert.equal(batch.measurements.length, 1);
  assert.deepEqual(
    Object.keys(batch.measurements[0]).sort(),
    ['frequenceCardiaque', 'horodatage', 'pas', 'spo2'].sort(),
  );
});
