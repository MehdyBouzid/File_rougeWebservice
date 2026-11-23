# Contrats API — Mesures

Le simulateur d’Egor envoie des relevés fictifs par lots. Le soignant les consulte pour suivre l’évolution de ses patients.

Ce guide décrit le contrat attendu, pas une ingestion déjà opérationnelle. Sources : [opérations mesures](../../openapi/paths/measurements.yaml) et [schémas JSON](../../openapi/components/schemas.yaml).

```text
simulateur → POST /measurements → lot enregistré → évaluation des seuils → alertes
soignant  → GET /patients/{patientId}/measurements → mesures et pagination
```

L’enregistrement est atomique. Les garanties techniques entre stockage, évaluation et création des alertes restent à préciser.

## 1. Envoyer un lot

`POST /measurements` reçoit un lot toutes les minutes, avec au moins un relevé **pour un seul patient**.

```http
POST /measurements HTTP/1.1
Authorization: Bearer <jeton>
Content-Type: application/json
```

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

**Les trois champs du lot sont obligatoires :**

- `patientId` désigne le patient de tous les relevés.
- `batchId` identifie le lot. Chaque nouveau lot reçoit un nouvel identifiant.
- `measurements` est un tableau non vide de relevés.

**Chaque relevé exige quatre champs :**

- `horodatage` : chaîne au format RFC 3339 avec fuseau, par exemple `Z` pour UTC.
- `frequenceCardiaque` : nombre.
- `spo2` : nombre représentant la saturation en oxygène.
- `pas` : entier, nombre de pas depuis le relevé précédent, et non compteur cumulé.

Les identifiants de l’exemple n’imposent ni préfixe ni UUID. Le schéma ne fixe pas encore les unités, les bornes numériques ni l’interdiction des propriétés supplémentaires.

**Pour développer sans NestJS :** [lancer Prism](../outillage-tp3.md#3-mock-prism), puis envoyer le lot à `http://127.0.0.1:4010/measurements`. Le mock ne conserve rien et ne vérifie pas les doublons.

## 2. Règles du lot

- Un seul relevé invalide entraîne le rejet du lot entier.
- L’enregistrement se fait dans une transaction : toutes les mesures ou aucune.
- Un `batchId` déjà enregistré donne `409`, même avec un contenu identique. Aucune nouvelle mesure n’est ajoutée.
- Chaque mesure est rattachée au patient du lot. L’API vérifie ensuite les seuils applicables dans le parcours prévu.

## 3. Authentification et autorisation

L’ingestion exige un émetteur authentifié, le scope montre et l’autorisation d’envoyer des mesures pour le patient indiqué. **Connaître `patientId` ne donne aucun droit.**

OAuth 2.0/JWT et des scopes distincts pour montre, patient et soignant sont retenus. Les noms de scopes sont provisoires ; le mécanisme de rattachement entre émetteur et patient reste à définir.

## 4. Réponses HTTP prévues

- `201` : lot validé et enregistré, en `application/json` avec `Location`.
- `400` : données invalides, champ obligatoire absent ou tableau `measurements` vide.
- `401` : authentification absente ou invalide.
- `403` : rôle ou scope montre insuffisant.
- `404` : patient inexistant ou non autorisé pour l’émetteur.
- `409` : `batchId` déjà enregistré, quel que soit le contenu.

Le corps du `201` (`BatchReceipt`) et l’URI de `Location` restent à définir. Aucun exemple de réponse ni endpoint de consultation des lots n’est ajouté.

Les erreurs utilisent `application/problem+json` ; voir la [revue HTTP](../api-review.md#post-measurements).

## 5. Consulter les mesures d’un patient

`GET /patients/{patientId}/measurements` exige le scope soignant, le suivi du patient et un consentement valide.

```http
GET /patients/patient-001/measurements?startDate=2026-10-01T00:00:00Z&endDate=2026-10-31T00:00:00Z&page=0&size=50 HTTP/1.1
Authorization: Bearer <jeton>
```

- `patientId` : identifiant dans le chemin.
- `startDate` et `endDate` : filtres de période facultatifs.
- `page` : entier à partir de `0`, défaut `0`.
- `size` : entier, défaut `50`, maximum `100` ; au-delà, `400`.

La réponse contient les mesures et la pagination : page actuelle, taille de page et nombre total de pages. L’enveloppe `MeasurementPage` reste ouverte ; aucun nom de propriété de pagination n’est imposé.

**Réponses prévues**

- `200` : mesures récupérées.
- `400` : période ou pagination invalide.
- `401` : authentification absente ou invalide.
- `403` : rôle ou scope soignant insuffisant.
- `404` : patient inexistant, non suivi ou sans consentement valide, sans distinguer les cas.

## 6. Points à valider

- Types et formats des identifiants, unités et bornes numériques.
- Corps de confirmation du `201` et valeur de `Location`.
- Stockage des lots et garanties entre persistance, seuils et alertes : voir la [conception](../design.md#contrats-techniques).
- Fournisseur et flux OAuth, noms définitifs des scopes, identification du simulateur et rattachement au patient.
- Enveloppe `MeasurementPage`, format et bornes des filtres de dates, période par défaut et ordre de tri.
