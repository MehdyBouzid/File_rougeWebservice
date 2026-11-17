import type { Response } from 'supertest';
import { setupIntegrationTestContext } from './test-context';

const TEST_JWT = process.env.INTEGRATION_TEST_JWT;

if (!TEST_JWT) {
  throw new Error(
    'INTEGRATION_TEST_JWT must contain a valid JWT for authenticated integration tests',
  );
}

const TEST_AUTHORIZATION = `Bearer ${TEST_JWT}`;

// Most success schemas have no defined properties, so assert JSON presence without guessing fields.
function expectJsonResponse(response: Response, status: number): void {
  expect(response.status).toBe(status);
  expect(response.headers['content-type']).toMatch(/^application\/json(?:;|$)/i);
  expect(response.body).not.toBeUndefined();
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

  describe('POST /measurements', () => {
    it('creates a measurement batch', async () => {
      const response = await getContext()
        .http.post('/measurements')
        .set('Authorization', TEST_AUTHORIZATION)
        .send({ batchId: 'batch-tdd-001', measurements: [{}] });

      expectJsonResponse(response, 201);
      expectLocationHeader(response);
    });

    it('rejects a batch without its required measurements', async () => {
      const response = await getContext()
        .http.post('/measurements')
        .set('Authorization', TEST_AUTHORIZATION)
        .send({ batchId: 'batch-tdd-001', measurements: [] });

      expectProblemResponse(response, 400);
    });

    it('rejects a batchId that has already been used', async () => {
      const { http } = getContext();
      const batch = { batchId: 'batch-tdd-001', measurements: [{}] };
      const firstResponse = await http
        .post('/measurements')
        .set('Authorization', TEST_AUTHORIZATION)
        .send(batch);

      expectJsonResponse(firstResponse, 201);
      expectLocationHeader(firstResponse);

      const duplicateResponse = await http
        .post('/measurements')
        .set('Authorization', TEST_AUTHORIZATION)
        .send(batch);

      expectProblemResponse(duplicateResponse, 409);
    });
  });

  describe('GET /patients/{patientId}/measurements', () => {
    it('returns measurements for the requested period', async () => {
      const response = await getContext()
        .http.get('/patients/42/measurements')
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
        .http.get('/patients/42/measurements')
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

  describe('GET /patients/{patientId}', () => {
    it('returns the requested patient', async () => {
      const response = await getContext()
        .http.get('/patients/42')
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

  describe('GET /alerts/{alertId}', () => {
    it('returns the requested alert', async () => {
      const response = await getContext()
        .http.get('/alerts/12')
        .set('Authorization', TEST_AUTHORIZATION);

      expectJsonResponse(response, 200);
    });

    it('returns a problem when the alert does not exist', async () => {
      const response = await getContext()
        .http.get('/alerts/alert-not-found')
        .set('Authorization', TEST_AUTHORIZATION);

      expectProblemResponse(response, 404);
    });
  });

  describe('PATCH /alerts/{alertId}', () => {
    it('marks an alert as treated', async () => {
      const response = await getContext()
        .http.patch('/alerts/12')
        .set('Authorization', TEST_AUTHORIZATION)
        .send({ statut: 'TRAITEE' });

      expectJsonResponse(response, 200);
    });

    it('rejects a status other than TRAITEE', async () => {
      const response = await getContext()
        .http.patch('/alerts/12')
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
  });

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

  describe('POST /patients/{patientId}/seuils', () => {
    it('creates a patient threshold', async () => {
      const response = await getContext()
        .http.post('/patients/42/seuils')
        .set('Authorization', TEST_AUTHORIZATION)
        // The OpenAPI schema has no named fields; keep this request schema-minimal.
        .send({});

      expectJsonResponse(response, 201);
      expectLocationHeader(response);
    });

    it('rejects a non-object threshold body', async () => {
      const response = await getContext()
        .http.post('/patients/42/seuils')
        .set('Authorization', TEST_AUTHORIZATION)
        .set('Content-Type', 'application/json')
        .send('null');

      expectProblemResponse(response, 400);
    });

    it('returns a problem when the patient does not exist', async () => {
      const response = await getContext()
        .http.post('/patients/patient-not-found/seuils')
        .set('Authorization', TEST_AUTHORIZATION)
        .send({});

      expectProblemResponse(response, 404);
    });
  });

  describe('PATCH /patients/{patientId}/seuils/{seuilId}', () => {
    it('updates a patient threshold', async () => {
      const response = await getContext()
        .http.patch('/patients/42/seuils/7')
        .set('Authorization', TEST_AUTHORIZATION)
        // Field names and empty-patch behavior are not defined by the OpenAPI contract.
        .send({});

      expectJsonResponse(response, 200);
    });

    it('rejects a non-object threshold body', async () => {
      const response = await getContext()
        .http.patch('/patients/42/seuils/7')
        .set('Authorization', TEST_AUTHORIZATION)
        .set('Content-Type', 'application/json')
        .send('null');

      expectProblemResponse(response, 400);
    });

    it('returns a problem when the patient or threshold does not exist', async () => {
      const response = await getContext()
        .http.patch('/patients/patient-not-found/seuils/7')
        .set('Authorization', TEST_AUTHORIZATION)
        .send({});

      expectProblemResponse(response, 404);
    });
  });
});
