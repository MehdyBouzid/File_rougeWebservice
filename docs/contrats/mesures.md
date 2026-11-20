# Contrats API — Mesures

Les mesures fictives alimentent le suivi des patients et l’évaluation des seuils. Ce guide décrit les envois du simulateur d’Egor et la consultation par le soignant.

Sources : [schémas JSON](../../openapi/components/schemas.yaml) et [opérations sur les mesures](../../openapi/paths/measurements.yaml). Il s’agit du contrat attendu, pas de fonctionnalités déjà opérationnelles.

## 1. Envoyer un lot

- Méthode et chemin : `POST /measurements`.
- En-tête : `Content-Type: application/json`.
- Un lot toutes les minutes, avec un ou plusieurs relevés pour un seul patient.

Sans backend, [lancer Prism](../outillage-tp3.md#3-mock-prism) et appeler `http://127.0.0.1:4010/measurements`. Ce mock ne persiste rien et ne vérifie ni les doublons ni les règles métier.

## 2. Corps JSON

```json
{
  "patientId": "patient-001",
  "batchId": "lot-001",
  "measurements": [
    {
      "horodatage": "2026-11-19T10:00:00Z",
      "frequenceCardiaque": 75,
      "spo2": 98,
      "pas": 120
    }
  ]
}
```

Les trois champs du lot sont obligatoires :

- `patientId` : patient auquel toutes les mesures du lot sont rattachées.
- `batchId` : identifiant unique, à renouveler pour chaque nouveau lot.
- `measurements` : tableau non vide de relevés.

Chaque relevé contient quatre champs obligatoires :

- `horodatage` : chaîne RFC 3339 avec fuseau horaire (`Z` indique UTC).
- `frequenceCardiaque` : nombre, fréquence cardiaque relevée.
- `spo2` : nombre, saturation en oxygène relevée.
- `pas` : entier, nombre de pas depuis le relevé précédent, pas un compteur cumulé.

**[À VALIDER]** Types et formats des identifiants, unités et bornes numériques. Les identifiants de l’exemple n’imposent ni préfixe ni UUID.

## 3. Règles du lot

- Un seul relevé invalide entraîne le rejet du lot entier.
- L’enregistrement est atomique, dans une transaction : toutes les mesures ou aucune.
- Un `batchId` déjà enregistré entraîne `409 Conflict`, contenu identique ou différent, sans nouvel enregistrement.
- Les mesures sont rattachées au patient indiqué ; l’API vérifie ensuite les seuils applicables.

**[À VALIDER]** Stockage des lots et garanties entre persistance, évaluation et création des alertes ; voir la [conception](../design.md#contrats-techniques).

## 4. Réponses HTTP prévues

- `201 Created` : lot validé et enregistré, réponse en `application/json` avec `Location`. **[À VALIDER]** Corps de confirmation et valeur de cet en-tête.
- `400 Bad Request` : données invalides, dont un champ obligatoire absent ou `measurements` vide.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : émetteur authentifié non autorisé à transmettre pour le patient concerné.
- `409 Conflict` : `batchId` déjà enregistré, même si le contenu est identique.

Les erreurs utilisent `application/problem+json` ; voir la [revue des réponses HTTP](../api-review.md).

## 5. Authentification et autorisation

OAuth 2.0 avec JWT est retenu, avec des scopes distincts pour montres, patients et soignants. Le backend devra vérifier le jeton `Authorization: Bearer …` et le droit de transmettre pour le `patientId` indiqué ; cet identifiant seul n’autorise pas l’envoi.

**[À VALIDER]** Fournisseur, flux, noms des scopes, identification et autorisation du simulateur.

## 6. Consulter les mesures d’un patient

### `GET /patients/{patientId}/measurements`

L’accès exige le suivi du patient, les autorisations du soignant et un consentement valide.

**Paramètres**

- `patientId` : identifiant du patient dans le chemin.
- `startDate` et `endDate` : filtres de période facultatifs.
- `page` : entier à partir de `0`, valeur par défaut `0`.
- `size` : entier, valeur par défaut `50`, maximum `100`. Une valeur supérieure est refusée avec `400`.

**JSON attendu**

La réponse comprend les mesures (horodatage, fréquence cardiaque, SpO₂, pas), la page actuelle, la taille de page et le nombre total de pages.

**[À VALIDER]** Enveloppe et noms des champs JSON de `MeasurementPage` ; aucun exemple de réponse définitif n’est proposé.

**Réponses prévues**

- `200 OK` : mesures récupérées, en `application/json`.
- `400 Bad Request` : période ou pagination invalide.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : suivi, autorisations ou consentement requis non satisfaits.
- `404 Not Found` : patient introuvable.

**[À VALIDER]** Format des filtres de dates, bornes, période par défaut et ordre de tri.
