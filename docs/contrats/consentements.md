# Contrats API — Consentements

Ces opérations sont réservées au patient authentifié (scope patient). Le segment `me` désigne le patient identifié par son jeton : aucun `patientId` n’est transmis dans le chemin. Ce guide décrit le contrat attendu, pas une implémentation.

Sources : [opérations consentements](../../openapi/paths/consents.yaml) et schéma `ConsentList` dans [schemas.yaml](../../openapi/components/schemas.yaml). Les erreurs utilisent `application/problem+json`.

## Consulter ses consentements

`GET /patients/me/consents` renvoie les consentements du patient connecté : identifiant, soignant concerné, dates de début et de fin, état. Aucun paramètre.

```http
GET /patients/me/consents HTTP/1.1
Authorization: Bearer <jeton>
```

Le format de la liste, les noms des champs, les valeurs de l’état et la nullabilité de la date de fin restent à définir.

- `200` : consentements récupérés.
- `401` : authentification absente ou invalide.
- `403` : scope patient manquant (par exemple jeton de soignant ou de montre).

La liste ne contient jamais les consentements d’un autre patient.

## Retirer un consentement

`DELETE /patients/me/consents/{consentId}` retire un consentement donné précédemment. Pas de corps de requête.

```http
DELETE /patients/me/consents/consent-001 HTTP/1.1
Authorization: Bearer <jeton>
```

```http
HTTP/1.1 204 No Content
```

```text
retrait ──► accès futurs du soignant concerné bloqués
        └─► consentement, trace du retrait et historique des données conservés
```

Le retrait n’est pas une suppression : le consentement et la trace de son retrait sont conservés, ainsi que l’historique des données.

- `204` : retrait enregistré, sans corps.
- `401` : authentification absente ou invalide.
- `403` : scope patient manquant.
- `404` : consentement inexistant **ou** appartenant à un autre patient, sans distinction.

## Points à valider

**[À VALIDER]** Comportement d’un retrait déjà effectué (aucun code supplémentaire retenu), types d’identifiants, JSON de consultation et lien entre l’identité OAuth et le patient, selon la [définition de sécurité](../../openapi/components/security.yaml).
