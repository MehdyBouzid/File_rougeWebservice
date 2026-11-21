# Contrats API — Consentements

Le patient authentifié consulte et retire ses propres consentements, avec le scope patient. `me` désigne l’identité de son jeton ; aucun `patientId` n’est fourni dans l’URL. Ce contrat reste à implémenter.

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

Le retrait bloque les accès concernés sans supprimer le consentement ni les données. Il ne définit pas un historique complet des renouvellements et retraits successifs.

- `204` : retrait enregistré, sans corps.
- `401` : authentification absente ou invalide.
- `403` : scope patient manquant.
- `404` : consentement inexistant **ou** appartenant à un autre patient, sans distinction.

## Points à valider

**[À VALIDER]**

- Réponse à un retrait déjà effectué : aucun code supplémentaire retenu.
- Types d’identifiants, JSON de consultation, état et conditions de validité des dates.
- Lien entre identité OAuth et patient : voir la [sécurité](../../openapi/components/security.yaml).

Le MCD relie chaque consentement à un patient et un soignant ; les dates et les renouvellements restent à préciser dans la [conception](../design.md#consentements).
