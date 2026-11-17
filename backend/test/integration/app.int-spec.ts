import { setupIntegrationTestContext } from './test-context';

describe('Application (integration)', () => {
  const getContext = setupIntegrationTestContext();

  it("n'ouvre pas de port pendant l'initialisation", () => {
    expect(getContext().app.getHttpServer().listening).toBe(false);
  });
});
