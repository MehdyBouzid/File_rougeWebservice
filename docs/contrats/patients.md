# Contrats API — Patients

Ces opérations sont destinées au soignant autorisé et portent uniquement sur les patients qu’il suit. Elles décrivent le comportement attendu, sans attester de son implémentation.

Sources : [opérations patients](../../openapi/paths/patients.yaml) et schémas `Patient` et `PatientPage` dans [schemas.yaml](../../openapi/components/schemas.yaml). Les succès utilisent `application/json` et les erreurs `application/problem+json`.

## Liste des patients

### `GET /patients`

Retrouver les patients suivis par le soignant connecté.

**Paramètres de requête**

- `page` : entier à partir de `0`, valeur par défaut `0`.
- `size` : entier, valeur par défaut `50`, maximum `100` ; une valeur supérieure est rejetée.

**JSON attendu**

La liste contient les informations des patients suivis : identifiant, nom, prénom et date de naissance, avec les informations de pagination. `PatientPage` laisse l’enveloppe et les noms des champs JSON ouverts.

**Réponses prévues**

- `200 OK` : liste paginée récupérée.
- `400 Bad Request` : pagination invalide.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : appelant non autorisé à consulter les patients.

## Détail d’un patient

### `GET /patients/{patientId}`

Consulter les informations d’un patient suivi.

**Paramètre de chemin :** `patientId`. Son type et son format ne sont pas encore définis.

**JSON attendu**

Le schéma `Patient` prévoit l’identifiant, le nom, le prénom et la date de naissance. Les noms des propriétés JSON et leurs types restent à définir ; aucun exemple de réponse définitif n’est fourni.

**Réponses prévues**

- `200 OK` : informations du patient récupérées.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : soignant ne suivant pas le patient ou ne disposant pas des autorisations nécessaires.
- `404 Not Found` : patient introuvable.

## Points ouverts

Le contrôle du consentement reste à valider pour les deux consultations. Les formats des identifiants et des réponses JSON restent ouverts, de même que les modalités OAuth/JWT décrites dans la [définition de sécurité](../../openapi/components/security.yaml).
