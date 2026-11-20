# Contrats API — Consentements

Ces opérations sont réservées au patient authentifié. Le segment `me` désigne le patient identifié à partir de son authentification, sans `patientId` transmis dans le chemin.

Sources : [opérations consentements](../../openapi/paths/consents.yaml) et schéma `ConsentList` dans [schemas.yaml](../../openapi/components/schemas.yaml). Les réponses d’erreur utilisent `application/problem+json`.

## Consulter ses consentements

### `GET /patients/me/consents`

Retrouver les consentements du patient connecté. Aucun paramètre n’est défini pour cette opération.

**JSON attendu**

La réponse en `application/json` contient les consentements avec leur identifiant, le soignant concerné, les dates de début et de fin et leur état. Le format de liste, les noms des champs, les valeurs de l’état et la présence ou nullabilité de la date de fin restent à définir.

**Réponses prévues**

- `200 OK` : consentements récupérés.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : appelant non autorisé à consulter les consentements en tant que patient.

## Retirer un consentement

### `DELETE /patients/me/consents/{consentId}`

Retirer un consentement précédemment donné.

**Paramètre de chemin :** `consentId`. Aucun corps de requête n’est défini dans OpenAPI.

**Règles**

- Le consentement doit appartenir au patient connecté.
- Le retrait empêche les accès futurs concernés.
- Le consentement et la trace de son retrait sont conservés, ainsi que l’historique des données. Il ne s’agit pas d’une suppression de cet historique.

**Réponses prévues**

- `204 No Content` : retrait enregistré, sans corps de réponse.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : consentement existant mais appartenant à un autre patient.
- `404 Not Found` : consentement introuvable.

## Points ouverts

Le comportement d’un retrait déjà effectué reste à décider ; aucun code supplémentaire n’est retenu. Les types d’identifiants, le JSON de consultation et le lien entre identité OAuth et patient restent également ouverts, selon la [définition de sécurité](../../openapi/components/security.yaml).
