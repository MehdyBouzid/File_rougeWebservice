import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createWatchState(watchIndex) {
  return {
    heartRate: 68 + watchIndex * 3,
    spo2: 98,
  };
}

export function nextWatchMeasurement(state, timestamp = new Date()) {
  state.heartRate = clamp(
    state.heartRate + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 4),
    45,
    180,
  );
  state.spo2 = clamp(
    state.spo2 + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.75 ? 0 : 1),
    92,
    100,
  );

  return {
    horodatage: timestamp.toISOString(),
    frequenceCardiaque: state.heartRate,
    spo2: state.spo2,
    pas: Math.floor(Math.random() * 121),
  };
}

export function generateMeasurementBatch(patientId, watchIndex, timestamp = new Date()) {
  const state = generateMeasurementBatch.states[watchIndex] ?? createWatchState(watchIndex);
  generateMeasurementBatch.states[watchIndex] = state;

  return {
    patientId,
    batchId: `lot-${randomUUID()}`,
    measurements: [nextWatchMeasurement(state, timestamp)],
  };
}

generateMeasurementBatch.states = [];

function parseArguments(argv) {
  const options = {
    url: process.env.API_URL || 'http://127.0.0.1:3000/measurements',
    patientIds: (process.env.PATIENT_IDS || 'patient-001,patient-002,patient-003')
      .split(',')
      .map((patientId) => patientId.trim())
      .filter(Boolean),
    count: Number(process.env.WATCH_COUNT || 3),
    intervalMs: Number(process.env.IOT_INTERVAL_MS || 60_000),
    once: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--once') {
      options.once = true;
    } else if (argument === '--url') {
      options.url = argv[++index];
    } else if (argument === '--count') {
      options.count = Number(argv[++index]);
    } else if (argument === '--interval') {
      options.intervalMs = Number(argv[++index]);
    } else if (argument === '--patients') {
      options.patientIds = argv[++index]
        .split(',')
        .map((patientId) => patientId.trim())
        .filter(Boolean);
    } else if (argument === '--help') {
      return { ...options, help: true };
    }
  }

  if (!Number.isInteger(options.count) || options.count < 1) {
    throw new Error('--count doit etre un entier superieur ou egal a 1');
  }
  if (!Number.isFinite(options.intervalMs) || options.intervalMs < 1000) {
    throw new Error('--interval doit etre au moins 1000 millisecondes');
  }
  if (options.patientIds.length === 0) {
    throw new Error('Au moins un patient doit etre fourni');
  }

  return options;
}

export async function sendBatch(url, batch, authorization = process.env.IOT_AUTHORIZATION) {
  const headers = { 'Content-Type': 'application/json' };
  if (authorization) {
    headers.Authorization = authorization;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(batch),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`);
  }

  return response;
}

async function run() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(`Usage: node scripts/simulate-iot.mjs [options]

  --once                Envoie un lot puis quitte
  --count <nombre>      Nombre de montres (defaut: 3)
  --patients <ids>      Identifiants separes par des virgules
  --url <url>           Endpoint POST /measurements
  --interval <ms>       Intervalle entre deux lots (defaut: 60000)

Variables: API_URL, PATIENT_IDS, WATCH_COUNT, IOT_INTERVAL_MS, IOT_AUTHORIZATION`);
    return;
  }

  const statesCount = options.count;
  generateMeasurementBatch.states = Array.from(
    { length: statesCount },
    (_, watchIndex) => createWatchState(watchIndex),
  );

  const sendAllBatches = async () => {
    for (let watchIndex = 0; watchIndex < options.count; watchIndex += 1) {
      const patientIndex = watchIndex % options.patientIds.length;
      const batch = generateMeasurementBatch(
        options.patientIds[patientIndex],
        watchIndex,
      );

      await sendBatch(options.url, batch);
      console.log(
        `Montre ${watchIndex + 1} -> ${batch.patientId}: FC ${batch.measurements[0].frequenceCardiaque}, SpO2 ${batch.measurements[0].spo2}, pas ${batch.measurements[0].pas}`,
      );
    }
  };

  await sendAllBatches();
  if (options.once) {
    return;
  }

  setInterval(() => {
    sendAllBatches().catch((error) => console.error(error.message));
  }, options.intervalMs);
}

const isMainModule =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMainModule) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
