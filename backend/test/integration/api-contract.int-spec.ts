import type { Response } from 'supertest';
import { setupIntegrationTestContext } from './test-context';

const TEST_JWT = process.env.INTEGRATION_TEST_JWT;
const TEST_AUTHORIZATION = `Bearer ${TEST_JWT ?? 'integration-test-placeholder'}`;
// Sans INTEGRATION_TEST_JWT, la valeur de remplacement n’est pas un JWT valide.
const VALID_MEASUREMENT_BATCH = {
  patientId: 'patient-001',
  batchId: 'lot-001',
  measurements: [
    {
      horodatage: '2026-11-20T10:00:00Z',
      frequenceCardiaque: 75,
      spo2: 98,
      pas: 120,
    },
  ],
};

// Vérifie statut, type JSON et présence d’un corps sans supposer de propriétés non définies.
function expectJsonResponse(response: Response, status: number): void {
  expect(response.status).toBe(status);
  expect(response.headers['content-type']).toMatch(/^application\/json(?:;|$)/i);
  expect(response.body).not.toBeUndefined();
}

function expectAlertDetail(
  response: Response,
  status: number,
  alertStatus: 'ACTIVE' | 'TRAITEE',
): void {
  expectJsonResponse(response, status);
  expect(response.body).toEqual(
    expect.objectContaining({
      typeMesure: expect.any(String),
      valeurMesuree: expect.any(Number),
      valeurSeuil: expect.any(Number),
      statut: alertStatus,
      horodatage: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
      ),
    }),
  );
  expect(response.body).toHaveProperty('alertId');
  expect(response.body).toHaveProperty('patientId');
}

function expectProblemResponse(response: Response, status: number): void {
  expect(response.status).toBe(status);
  expect(response.headers['content-type']).toMatch(
    /^application\/problem\+json(?:;|$)/i,
  );
  expect(response.body).toEqual(
    expect.objectContaining({
      type: expect.any(String),
      title: expect.any(String),
      status,
    }),
  );
}

function expectLocationHeader(response: Response): void {
  const location = response.headers.location;
  expect(location).toEqual(expect.any(String));

  if (typeof location !== 'string') {
    throw new Error('Expected Location to be a URI-reference string');
  }

  expect(() => new URL(location, 'http://example.test')).not.toThrow();
}

describe('OpenAPI integration contract', () => {
  const getContext = setupIntegrationTestContext();

  // Le lot nominal contient les champs requis ; les autres cas vérifient un tableau vide et un batchId répété.
  describe('POST /measurements', () => {
    it('creates a measurement batch', async () => {
      const response = await getContext()
        .http.post('/measurements')
        .set('Authorization', TEST_AUTHORIZATION)
        .send(VALID_MEASUREMENT_BATCH);

      expectJsonResponse(response, 201);
      expectLocationHeader(response);
    });

    it('rejects a batch without its required measurements', async () => {
      const response = await getContext()
        .http.post('/measurements')
        .set('Authorization', TEST_AUTHORIZATION)
        .send({ ...VALID_MEASUREMENT_BATCH, measurements: [] });

      expectProblemResponse(response, 400);
    });

    it('rejects a batchId that has already been used', async () => {
      const { http } = getContext();
      const firstResponse = await http
        .post('/measurements')
        .set('Authorization', TEST_AUTHORIZATION)
        .send(VALID_MEASUREMENT_BATCH);

      expectJsonResponse(firstResponse, 201);
      expectLocationHeader(firstResponse);

      const duplicateResponse = await http
        .post('/measurements')
        .set('Authorization', TEST_AUTHORIZATION)
        .send(VALID_MEASUREMENT_BATCH);

      expectProblemResponse(duplicateResponse, 409);
    });
  });

  // Vérifie une requête avec période et pagination, size > 100 (400) et patient absent (404).
  describe('GET /patients/{patientId}/measurements', () => {
    it('returns measurements for the requested period', async () => {
      const response = await getContext()
        .http.get('/patients/patient-001/measurements')
        .set('Authorization', TEST_AUTHORIZATION)
        .query({
          startDate: '2026-10-01T00:00:00Z',
          endDate: '2026-10-31T00:00:00Z',
          page: 0,
          size: 50,
        });

      expectJsonResponse(response, 200);
    });

    it('rejects a page size greater than 100', async () => {
      const response = await getContext()
        .http.get('/patients/patient-001/measurements')
        .set('Authorization', TEST_AUTHORIZATION)
        .query({ size: 101 });

      expectProblemResponse(response, 400);
    });

    it('returns a problem when the patient does not exist', async () => {
      const response = await getContext()
        .http.get('/patients/patient-not-found/measurements')
        .set('Authorization', TEST_AUTHORIZATION);

      expectProblemResponse(response, 404);
    });
  });

  // Vérifie la réponse JSON de la liste et le rejet d’une taille supérieure à 100.
  describe('GET /patients', () => {
    it("returns the authenticated caregiver's patient page", async () => {
      const response = await getContext()
        .http.get('/patients')
        .set('Authorization', TEST_AUTHORIZATION)
        .query({ page: 0, size: 50 });

      expectJsonResponse(response, 200);
    });

    it('rejects a page size greater than 100', async () => {
      const response = await getContext()
        .http.get('/patients')
        .set('Authorization', TEST_AUTHORIZATION)
        .query({ size: 101 });

      expectProblemResponse(response, 400);
    });
  });

  // Vérifie les statuts 200 et 404 ; les propriétés JSON de Patient ne sont pas définies.
  describe('GET /patients/{patientId}', () => {
    it('returns the requested patient', async () => {
      const response = await getContext()
        .http.get('/patients/patient-001')
        .set('Authorization', TEST_AUTHORIZATION);

      expectJsonResponse(response, 200);
    });

    it('returns a problem when the patient does not exist', async () => {
      const response = await getContext()
        .http.get('/patients/patient-not-found')
        .set('Authorization', TEST_AUTHORIZATION);

      expectProblemResponse(response, 404);
    });
  });

  // Vérifie la réponse JSON de la liste et le rejet d’une taille supérieure à 100.
  describe('GET /alerts', () => {
    it("returns the authenticated caregiver's alert page", async () => {
      const response = await getContext()
        .http.get('/alerts')
        .set('Authorization', TEST_AUTHORIZATION)
        .query({ page: 0, size: 50 });

      expectJsonResponse(response, 200);
    });

    it('rejects a page size greater than 100', async () => {
      const response = await getContext()
        .http.get('/alerts')
        .set('Authorization', TEST_AUTHORIZATION)
        .query({ size: 101 });

      expectProblemResponse(response, 400);
    });
  });

  // Vérifie les champs typés d’AlertDetail et la présence des deux identifiants requis.
  describe('GET /alerts/{alertId}', () => {
    it('returns the requested alert', async () => {
      const response = await getContext()
        .http.get('/alerts/alerte-001')
        .set('Authorization', TEST_AUTHORIZATION);

      expectAlertDetail(response, 200, 'ACTIVE');
    });

    it('returns a problem when the alert does not exist', async () => {
      const response = await getContext()
        .http.get('/alerts/alert-not-found')
        .set('Authorization', TEST_AUTHORIZATION);

      expectProblemResponse(response, 404);
    });
  });

  // Vérifie la transition vers TRAITEE, le statut invalide (400), l’alerte absente (404) et le doublon (409).
  describe('PATCH /alerts/{alertId}', () => {
    it('marks an alert as treated', async () => {
      const response = await getContext()
        .http.patch('/alerts/alerte-001')
        .set('Authorization', TEST_AUTHORIZATION)
        .send({ statut: 'TRAITEE' });

      expectAlertDetail(response, 200, 'TRAITEE');
    });

    it('rejects a status other than TRAITEE', async () => {
      const response = await getContext()
        .http.patch('/alerts/alerte-001')
        .set('Authorization', TEST_AUTHORIZATION)
        .send({ statut: 'ACTIVE' });

      expectProblemResponse(response, 400);
    });

    it('returns a problem when the alert does not exist', async () => {
      const response = await getContext()
        .http.patch('/alerts/alert-not-found')
        .set('Authorization', TEST_AUTHORIZATION)
        .send({ statut: 'TRAITEE' });

      expectProblemResponse(response, 404);
    });

    it('rejects treating an alert that is already treated', async () => {
      const { http } = getContext();
      const firstResponse = await http
        .patch('/alerts/alerte-001')
        .set('Authorization', TEST_AUTHORIZATION)
        .send({ statut: 'TRAITEE' });

      expectAlertDetail(firstResponse, 200, 'TRAITEE');

      const repeatedResponse = await http
        .patch('/alerts/alerte-001')
        .set('Authorization', TEST_AUTHORIZATION)
        .send({ statut: 'TRAITEE' });

      expectProblemResponse(repeatedResponse, 409);
    });
  });

  // Vérifie une réponse JSON avec un en-tête Bearer, puis le 401 et son challenge sans en-tête.
  describe('GET /patients/me/consents', () => {
    it("returns the connected patient's consents", async () => {
      const response = await getContext()
        .http.get('/patients/me/consents')
        .set('Authorization', TEST_AUTHORIZATION);

      expectJsonResponse(response, 200);
    });

    it('requires bearer authentication', async () => {
      const response = await getContext().http.get('/patients/me/consents');

      expectProblemResponse(response, 401);
      expect(response.headers['www-authenticate']).toMatch(/^Bearer\b/i);
    });
  });

  // Vérifie le retrait sans corps (204) et le cas d’un consentement absent (404).
  describe('DELETE /patients/me/consents/{consentId}', () => {
    it('withdraws a consent without returning a body', async () => {
      const response = await getContext()
        .http.delete('/patients/me/consents/3')
        .set('Authorization', TEST_AUTHORIZATION);

      expect(response.status).toBe(204);
      expect(response.text).toBe('');
    });

    it('returns a problem when the consent does not exist', async () => {
      const response = await getContext()
        .http.delete('/patients/me/consents/consent-not-found')
        .set('Authorization', TEST_AUTHORIZATION);

      expectProblemResponse(response, 404);
    });
  });

  // Vérifie une réponse JSON sans forme imposée et le cas d’un patient absent (404).
  describe('GET /patients/{patientId}/seuils', () => {
    it("returns the patient's thresholds", async () => {
      const response = await getContext()
        .http.get('/patients/42/seuils')
        .set('Authorization', TEST_AUTHORIZATION);

      expectJsonResponse(response, 200);
    });

    it('returns a problem when the patient does not exist', async () => {
      const response = await getContext()
        .http.get('/patients/patient-not-found/seuils')
        .set('Authorization', TEST_AUTHORIZATION);

      expectProblemResponse(response, 404);
    });
  });

  // Les champs de ThresholdCreate ne sont pas définis ; seul le rejet d’un corps non objet est testé.
  describe('POST /patients/{patientId}/seuils', () => {
    it.todo('creates a threshold once ThresholdCreate fields are defined');

    it('rejects a non-object threshold body', async () => {
      const response = await getContext()
        .http.post('/patients/42/seuils')
        .set('Authorization', TEST_AUTHORIZATION)
        .set('Content-Type', 'application/json')
        .send('null');

      expectProblemResponse(response, 400);
    });

    it.todo(
      'returns a problem for a missing patient with a valid ThresholdCreate body',
    );
  });

  // Les champs et le comportement d’un PATCH vide ne sont pas définis ; seul le rejet d’un corps non objet est testé.
  describe('PATCH /patients/{patientId}/seuils/{seuilId}', () => {
    it.todo('updates a threshold once ThresholdPatch fields are defined');

    it('rejects a non-object threshold body', async () => {
      const response = await getContext()
        .http.patch('/patients/42/seuils/7')
        .set('Authorization', TEST_AUTHORIZATION)
        .set('Content-Type', 'application/json')
        .send('null');

      expectProblemResponse(response, 400);
    });

    it.todo(
      'returns a problem for a missing patient or threshold with a valid ThresholdPatch body',
    );
  });
});