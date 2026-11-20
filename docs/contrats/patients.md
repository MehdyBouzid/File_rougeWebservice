# Contrats API — Patients

Ces deux opérations sont réservées au soignant (scope soignant) et ne portent que sur **les patients qu’il suit**. Un patient non suivi est traité comme un patient inexistant. Ce guide décrit le contrat attendu, pas une implémentation.

Sources : [opérations patients](../../openapi/paths/patients.yaml) et schémas `Patient` et `PatientPage` dans [schemas.yaml](../../openapi/components/schemas.yaml). Les succès utilisent `application/json` et les erreurs `application/problem+json`.

## Lister ses patients

`GET /patients` renvoie les patients suivis par le soignant connecté : identifiant, nom, prénom et date de naissance, avec la pagination.

```http
GET /patients?page=0&size=50 HTTP/1.1
Authorization: Bearer <jeton>
```

`page` commence à `0` (défaut `0`) et `size` vaut `50` par défaut, maximum `100`. L’enveloppe de la réponse et le nom des champs JSON restent à définir.

```text
soignant connecté ──► SUIVRE ──► ses patients seulement
```

La collection ne contient jamais un patient non suivi.

- `200` : liste paginée récupérée.
- `400` : pagination invalide.
- `401` : authentification absente ou invalide.
- `403` : scope soignant manquant.

## Lire un patient

`GET /patients/{patientId}` renvoie le patient (identifiant, nom, prénom, date de naissance).

```http
GET /patients/patient-001 HTTP/1.1
Authorization: Bearer <jeton>
```

Les noms et types des propriétés JSON ne sont pas encore définis ; aucun exemple de réponse n’est fourni.

- `200` : informations récupérées.
- `401` : authentification absente ou invalide.
- `403` : scope soignant manquant.
- `404` : patient inexistant ou non suivi par le soignant.

## Points à valider

**[À VALIDER]** Contrôle du consentement pour les deux consultations (s’il est retenu, son absence renvoie `404`), formats des identifiants et des réponses JSON, modalités OAuth/JWT décrites dans la [définition de sécurité](../../openapi/components/security.yaml).
