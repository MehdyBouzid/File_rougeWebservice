# Contrats API — Seuils

Ces opérations sont destinées au soignant autorisé pour un patient qu’il suit. Le contrôle du consentement reste à valider pour les trois opérations.

Sources : [opérations seuils](../../openapi/paths/seuils.yaml) et [schémas JSON](../../openapi/components/schemas.yaml). Les succès utilisent `application/json` et les erreurs `application/problem+json`. Les types et formats de `patientId` et `seuilId` restent ouverts.

## Consulter les seuils

### `GET /patients/{patientId}/seuils`

Consulter les limites configurées pour surveiller les mesures du patient.

**Paramètre de chemin :** `patientId`.

**JSON attendu**

`ThresholdList` prévoit les seuils avec leur identifiant, type de mesure, minimum, maximum et état actif ou désactivé. Le format de liste et les noms des champs JSON restent à définir.

**Réponses prévues**

- `200 OK` : seuils récupérés.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : soignant ne suivant pas le patient ou non autorisé.
- `404 Not Found` : patient introuvable.

## Créer un seuil

### `POST /patients/{patientId}/seuils`

Créer des limites pour les mesures d’un patient.

**Paramètre de chemin :** `patientId`.

**JSON reçu**

Les informations métier attendues sont le type de mesure, la valeur minimale et la valeur maximale. `ThresholdCreate` exige un objet, mais ne fixe pas encore les noms des propriétés ni leurs validations ; aucun exemple JSON définitif n’est proposé.

**Réponses prévues**

- `201 Created` : seuil créé, réponse décrite par `Threshold` et en-tête `Location` identifiant la ressource créée.
- `400 Bad Request` : données invalides ; critères précis à définir.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : soignant ne suivant pas le patient ou non autorisé à créer un seuil.
- `404 Not Found` : patient introuvable.
- `409 Conflict` : un seuil actif du même type existe déjà pour ce patient.

## Modifier un seuil

### `PATCH /patients/{patientId}/seuils/{seuilId}`

Adapter les limites ou l’état d’un seuil. Le seuil doit appartenir au patient indiqué.

**Paramètres de chemin :** `patientId` et `seuilId`.

**JSON reçu**

Seules les informations à modifier sont transmises : minimum, maximum ou état actif. Elles sont facultatives individuellement. `ThresholdPatch` exige un objet ; les noms des champs, les validations et le comportement d’un objet vide restent à définir.

**Réponses prévues**

- `200 OK` : seuil modifié, réponse décrite par `Threshold`.
- `400 Bad Request` : données de modification invalides.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : soignant ne suivant pas le patient ou non autorisé.
- `404 Not Found` : patient ou seuil introuvable.
- `409 Conflict` : activation en conflit avec un autre seuil actif du même type pour ce patient.

## Règles et points ouverts

Un seul seuil actif est autorisé par patient et type de mesure. La création est refusée si un seuil actif du même type existe déjà ; l’activation est également refusée en présence d’un autre seuil actif. La désactivation conserve le seuil dans l’historique.

Le schéma `Threshold` laisse le JSON de réponse ouvert. Le code de refus si le seuil appartient à un autre patient reste à valider, ainsi que le contrôle du consentement et les modalités OAuth/JWT décrites dans la [définition de sécurité](../../openapi/components/security.yaml).
