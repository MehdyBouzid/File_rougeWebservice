// Référence : openapi/patients/patients-contract.md et ses YAML associés.
// Les routes Patients restent à implémenter ; ces TODO ne vérifient aucun comportement.
// Préparer une application NestJS avec PostgreSQL isolé et des données fictives.
// Vérifier la base cible avant les écritures, réinitialiser les données entre les cas
// et fermer les connexions après la suite. Ne jamais utiliser la base de développement.
// Attendre la validation des JSON Patient/PatientPage et du périmètre du consentement.
// Utiliser les vrais contrôles d’accès lorsqu’ils seront raccordés, sans les contourner.
// Vérifier statuts, headers, JSON et erreurs Problem selon le contrat, sans réponse fictive.

describe('Patients — intégration à développer', () => {
  describe('GET /patients', () => {
    it.todo(
      'renvoie 200 avec uniquement les patients accessibles et la pagination',
    );
    it.todo('renvoie 400 pour une pagination invalide, notamment size > 100');
    it.todo('renvoie 401 si l’authentification est absente ou invalide');
    it.todo('renvoie 403 si le rôle ou le scope est insuffisant');
  });

  describe('GET /patients/{patientId}', () => {
    it.todo(
      'renvoie 200 avec les informations prévues pour un patient accessible',
    );
    it.todo('renvoie 404 pour un patient inexistant');
    it.todo('renvoie 404 pour un patient hors du périmètre autorisé');
    it.todo('renvoie 401 si l’authentification est absente ou invalide');
    it.todo('renvoie 403 si le rôle ou le scope est insuffisant');
  });
});
