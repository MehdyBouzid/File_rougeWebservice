import { describe, it } from '@jest/globals';

// Références : docs/design.md et openapi/alerts/alerts-contract.md.
// Utiliser PostgreSQL isolé et des données fictives.
// Préparer les patients, soignants, suivis, consentements, mesures et seuils.
// Réinitialiser les données entre les tests.
// Les critères de sélection des destinataires restent à définir.
// Le périmètre du consentement et l’acquittement individuel restent à clarifier.
// Restent aussi à valider : la définition d’un dépassement, le sens de
// valeurSeuil et d’horodatage, l’enveloppe AlertPage, le format des dates
// et la frontière entre 400 et 409 pour les transitions du PATCH.
// Le code actuel tranche certains de ces points : ne pas les considérer comme validés.

describe('Alerts — intégration à développer', () => {
  describe('Création après un dépassement', () => {
    it.todo(
      'crée une alerte ACTIVE lorsqu’une mesure dépasse un seuil applicable',
    );

    it.todo('lie l’alerte à la mesure et au seuil d’un même patient');

    it.todo('permet plusieurs alertes pour une même mesure');

    it.todo('ne crée aucune alerte en l’absence de dépassement');

    it.todo('ne crée aucune alerte pour un lot de mesures rejeté');

    it.todo(
      'prépare une notification générique sans donnée de santé ni identité',
    );
  });

  describe('GET /alerts', () => {
    it.todo('renvoie 200 avec uniquement les alertes accessibles au soignant');

    it.todo('exclut les alertes des patients non suivis');

    it.todo('inclut les alertes ACTIVE et TRAITEE');

    it.todo('retourne pour chaque alerte les champs de AlertSummary');

    it.todo('filtre les alertes par patientId, status et période');

    it.todo('respecte les filtres sans élargir le périmètre autorisé');

    it.todo(
      'renvoie 200 et une liste vide pour un patientId inexistant ou inaccessible',
    );

    it.todo('applique la pagination, avec page 0 et size 50 par défaut');

    it.todo('renvoie 400 pour un status inconnu');

    it.todo('renvoie 400 pour une page négative ou si size dépasse 100');

    it.todo('renvoie 400 pour une période invalide selon le format validé');

    it.todo('renvoie 401 si l’authentification est absente ou invalide');

    it.todo('renvoie 403 si le rôle ou le scope est insuffisant');
  });

  describe('GET /alerts/{alertId}', () => {
    it.todo(
      'renvoie 200 pour une alerte accessible avec un consentement valide',
    );

    it.todo('retourne les informations prévues par le contrat OpenAPI');

    it.todo('renvoie 404 pour une alerte inexistante');

    it.todo('renvoie 404 pour une alerte hors du périmètre autorisé');

    it.todo('renvoie 404 en absence de consentement valide');

    it.todo('renvoie 404 après le retrait du consentement');

    it.todo('ne permet pas de distinguer les causes d’un 404');

    it.todo('n’expose aucun identifiant de mesure ou de seuil');

    it.todo('renvoie 401 si l’authentification est absente ou invalide');

    it.todo('renvoie 403 si le rôle ou le scope est insuffisant');
  });

  describe('PATCH /alerts/{alertId}', () => {
    it.todo('autorise la transition du statut ACTIVE vers TRAITEE');

    it.todo('renvoie 200 avec AlertDetail au statut TRAITEE');

    it.todo('persiste le nouveau statut de l’alerte');

    it.todo('conserve l’alerte traitée dans l’historique');

    it.todo('refuse la réactivation d’une alerte TRAITEE');

    it.todo('renvoie 400 si statut est absent');

    it.todo('renvoie 400 pour une valeur de statut inconnue');

    it.todo('renvoie 409 si une alerte déjà TRAITEE est de nouveau acquittée');

    it.todo(
      'n’accepte qu’un seul de deux acquittements concurrents, l’autre recevant 409',
    );

    it.todo('conserve l’alerte inchangée lorsqu’une requête est refusée');

    it.todo('renvoie 404 pour une alerte inexistante ou inaccessible');

    it.todo('renvoie 401 si l’authentification est absente ou invalide');

    it.todo('renvoie 403 si le rôle ou le scope est insuffisant');
  });
});
