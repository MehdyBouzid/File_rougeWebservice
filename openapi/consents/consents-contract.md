# Contrats API — Consentements

Un consentement représente l’accord d’un patient pour l’accès d’un soignant à ses données. Le patient peut consulter ses accords et en retirer un pour bloquer les accès futurs concernés.

Les routes restent à implémenter. Sources : [opérations consentements](paths/consents.yaml), schéma `ConsentList` dans [schemas.yaml](components/schemas/schemas.yaml) et [modèle métier](../../docs/design.md#consentements).

## Qui peut agir ?

Le patient doit être authentifié avec le scope patient. Dans l’URL, `me` désigne le patient identifié par son jeton : aucun `patientId` n’est transmis.

La liste ne contient jamais les consentements d’un autre patient. Un retrait sur un consentement d’autrui donne `404`, comme pour un identifiant inexistant.

## Consulter ses consentements

`GET /patients/me/consents` ne reçoit aucun paramètre ni corps de requête.

```http
GET /patients/me/consents HTTP/1.1
Authorization: Bearer <jeton>
```

Les informations attendues sont l’identifiant du consentement, le soignant concerné, les dates de début et de fin, et l’état.

**Le JSON reste ouvert.** Le format de liste, les noms des champs, les valeurs de l’état, la présence et la nullabilité de la date de fin ne sont pas validés. Aucun exemple de réponse n’est donc imposé.

**Réponses prévues**

- `200` : consentements récupérés en `application/json`.
- `401` : authentification absente ou invalide.
- `403` : rôle ou scope patient insuffisant, par exemple avec un jeton de montre ou de soignant.

## Retirer un consentement

`DELETE /patients/me/consents/{consentId}` reçoit l’identifiant dans le chemin, sans corps de requête.

```http
DELETE /patients/me/consents/consent-001 HTTP/1.1
Authorization: Bearer <jeton>
```

```http
HTTP/1.1 204 No Content
```

```text
retrait → accès futurs concernés bloqués
        → consentement, trace du retrait et historique des données conservés
```

Retirer un accord ne supprime ni le consentement ni les mesures. Cette conservation ne définit pas un historique complet des renouvellements et retraits successifs.

**Réponses prévues**

- `204` : retrait enregistré, sans corps.
- `401` : authentification absente ou invalide.
- `403` : rôle ou scope patient insuffisant.
- `404` : consentement inexistant ou appartenant à un autre patient, sans distinction.

Les erreurs utilisent `application/problem+json` ; voir la [revue HTTP](../../docs/api-review.md).

## Points à valider

- Comportement d’un retrait répété : aucun code supplémentaire n’est retenu.
- JSON de consultation, types d’identifiants et valeurs de l’état.
- Conditions de validité des dates et renouvellement d’un consentement.
- Lien entre identité OAuth et patient, selon la [définition de sécurité](../security/components/security.yaml).
