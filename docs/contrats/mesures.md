# Contrats API — Mesures

Le simulateur d’Egor envoie des mesures fictives ; le soignant les consulte pour suivre ses patients. Ce guide décrit les échanges et règles attendus, encore à implémenter.

Sources : [schémas JSON](../../openapi/components/schemas.yaml) et [opérations sur les mesures](../../openapi/paths/measurements.yaml).

```text
montre ──► POST /measurements ──► enregistrement (tout ou rien) ──► évaluation des seuils ──► alertes
soignant ──► GET /patients/{patientId}/measurements
```

## 1. Envoyer un lot

`POST /measurements` : un lot par minute, avec un ou plusieurs relevés **pour un seul patient**. Sans backend, [lancer Prism](../outillage-tp3.md#3-mock-prism) et appeler `http://127.0.0.1:4010/measurements` ; ce mock ne persiste rien et ne vérifie ni doublons ni règles métier.

```http
POST /measurements HTTP/1.1
Authorization: Bearer <jeton>
Content-Type: application/json

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

Le lot a trois champs obligatoires : `patientId` (patient de toutes les mesures), `batchId` (identifiant unique, à renouveler à chaque lot) et `measurements` (tableau non vide).

Chaque relevé a quatre champs obligatoires :

- `horodatage` : RFC 3339 avec fuseau (`Z` pour UTC).
- `frequenceCardiaque` : nombre.
- `spo2` : nombre, saturation en oxygène.
- `pas` : entier, pas depuis le relevé précédent, pas un compteur cumulé.

Les identifiants de l’exemple n’imposent ni préfixe ni UUID.

## 2. Règles du lot

- Un seul relevé invalide entraîne le rejet du lot entier.
- L’enregistrement est atomique : toutes les mesures ou aucune, dans une transaction.
- Un `batchId` déjà enregistré donne `409`, même si le contenu est identique, sans nouvel enregistrement.
- Les mesures sont rattachées au patient indiqué, puis l’API vérifie les seuils applicables.

## 3. Authentification et autorisation

L’ingestion exige le scope montre (`403` sinon) et un patient existant, autorisé pour l’émetteur (`404` sinon). `patientId` seul ne donne aucun droit. OAuth 2.0/JWT et les trois scopes distincts sont retenus ; leurs noms (`montre`, `patient`, `soignant`) sont provisoires.

## 4. Réponses HTTP prévues

- `201` : lot validé et enregistré, en `application/json` avec `Location`.
- `400` : données invalides, champ obligatoire absent ou `measurements` vide.
- `401` : authentification absente ou invalide.
- `403` : scope montre manquant.
- `404` : patient inexistant ou non rattaché à l’émetteur authentifié.
- `409` : `batchId` déjà enregistré.

Les erreurs utilisent `application/problem+json` ; voir la [revue HTTP](../api-review.md#post-measurements).

## 5. Consulter les mesures d’un patient

`GET /patients/{patientId}/measurements` exige le scope soignant, le suivi du patient et un consentement valide.

```http
GET /patients/patient-001/measurements?startDate=2026-10-01T00:00:00Z&endDate=2026-10-31T00:00:00Z&page=0&size=50 HTTP/1.1
Authorization: Bearer <jeton>
```

`startDate` et `endDate` (période) sont facultatifs ; `page` commence à `0` et `size` vaut `50` par défaut, maximum `100` (au-delà : `400`). La réponse contient les mesures (horodatage, fréquence cardiaque, SpO₂, pas), la page actuelle, la taille de page et le nombre total de pages. L’enveloppe (`MeasurementPage`) reste à définir : aucun exemple de réponse n’est proposé.

- `200` : mesures récupérées.
- `400` : période ou pagination invalide.
- `401` : authentification absente ou invalide.
- `403` : scope soignant manquant.
- `404` : patient inexistant ou hors du périmètre du soignant (non suivi, consentement valide absent ou retiré).

## 6. Points à valider

**[À VALIDER]**

- Types et formats des identifiants, unités et bornes numériques.
- Corps de confirmation du `201` et valeur de `Location`.
- Stockage des lots et garanties entre persistance, évaluation et création des alertes ; voir la [conception](../design.md#contrats-techniques).
- Fournisseur OAuth, flux, noms définitifs des scopes, identification de la montre et rattachement montre-patient.
- Enveloppe de `MeasurementPage`, format des filtres de dates, bornes, période par défaut et ordre de tri.
