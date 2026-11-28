import { describe, it } from '@jest/globals';

// Références : docs/design.md et openapi/consents/consents-contract.md.
// Utiliser PostgreSQL isolé et des données fictives.
// Préparer les patients, soignants et consentements nécessaires.
// Réinitialiser les données entre les tests.
// Les conditions exactes de validité et de renouvellement restent à valider.

describe('Consents — intégration à développer', () => {
  describe('GET /patients/me/consents', () => {
    it.todo('renvoie 200 avec les consentements du patient connecté');

    it.todo('exclut les consentements des autres patients');

    it.todo('renvoie 401 si l’authentification est absente ou invalide');

    it.todo('renvoie 403 si le rôle ou le scope est insuffisant');
  });

  describe('DELETE /patients/me/consents/{consentId}', () => {
    it.todo('renvoie 204 après le retrait du consentement');

    it.todo('conserve le consentement retiré et la trace du retrait');

    it.todo('conserve l’historique des données du patient');

    it.todo('bloque immédiatement les accès concernés après le retrait');

    it.todo('renvoie 404 pour un consentement inexistant');

    it.todo('renvoie 404 pour un consentement appartenant à un autre patient');

    it.todo('renvoie 401 si l’authentification est absente ou invalide');

    it.todo('renvoie 403 si le rôle ou le scope est insuffisant');
  });
});
