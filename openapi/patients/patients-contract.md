# Contrats API — Patients

Le soignant retrouve les patients qu’il suit et consulte leurs informations. L’association `SUIVRE` définit ce périmètre ; être authentifié ne donne pas accès à tous les patients.

Les routes restent à implémenter. Sources : [opérations patients](paths/patients.yaml), schémas `Patient` et `PatientPage` dans [schemas.yaml](components/schemas/schemas.yaml).

## Accès et format des échanges

Le scope soignant est requis. Un scope est une permission portée par le jeton ; il ne remplace pas le contrôle du suivi.

Les succès utilisent `application/json`. Les erreurs suivent `application/problem+json`, le format structuré [Problem Details](../../docs/api-review.md#règles-http-communes).

```text
soignant authentifié → scope soignant → patients liés par SUIVRE
```

Le contrôle du consentement reste ouvert pour ces deux lectures. Ce point doit être harmonisé avec l’exigence du sujet, sans en déduire un droit d’accès sans consentement.

## Lister ses patients

`GET /patients` renvoie les patients suivis : identifiant, nom, prénom, date de naissance et pagination.

```http
GET /patients?page=0&size=50 HTTP/1.1
Authorization: Bearer <jeton>
```

- `page` : entier à partir de `0`, défaut `0`.
- `size` : entier, défaut `50`, maximum `100`.

La collection ne contient jamais un patient non suivi. L’enveloppe de réponse et les noms des champs JSON ne sont pas encore définis : aucun exemple de réponse n’est imposé.

**Réponses prévues**

- `200` : liste paginée récupérée.
- `400` : pagination invalide.
- `401` : authentification absente ou invalide.
- `403` : rôle ou scope soignant insuffisant.

## Lire un patient

`GET /patients/{patientId}` reçoit l’identifiant dans le chemin et renvoie les informations du patient suivi.

```http
GET /patients/patient-001 HTTP/1.1
Authorization: Bearer <jeton>
```

La réponse contient les mêmes informations d’identité que la liste. Les noms et types JSON restent à définir ; `patient-001` est un identifiant illustratif.

**Réponses prévues**

- `200` : informations récupérées.
- `401` : authentification absente ou invalide.
- `403` : rôle ou scope soignant insuffisant.
- `404` : patient inexistant ou non suivi, sans distinguer les cas.

## Points à valider

- **Consentement :** périmètre des deux lectures. S’il est exigé, son absence donne `404` en accès direct ou exclut le patient de la liste.
- **JSON :** structure de `Patient` et de `PatientPage`, noms des champs et types d’identifiants.
- **Sécurité :** modalités [OAuth/JWT](../security/components/security.yaml).

L’écart sur le consentement est détaillé dans la [conception](../../docs/design.md#périmètre-du-contrôle-du-consentement).
