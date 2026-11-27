# Contrats API — Seuils

Un seuil définit les limites d’un type de mesure pour un patient. Le soignant consulte ces limites, les adapte ou désactive un seuil sans le supprimer.

Les routes restent à implémenter. Sources : [opérations seuils](paths/seuils.yaml), [schémas JSON](components/schemas/schemas.yaml) et [contrat du cache](../cache/cache-contract.md).

## Vue d’ensemble

```text
POST  /patients/{patientId}/seuils           → créer : 201 + Location + ETag
GET   /patients/{patientId}/seuils           → lister : 200
GET   /patients/{patientId}/seuils/{seuilId} → lire : 200 + ETag, ou 304
PATCH /patients/{patientId}/seuils/{seuilId} → modifier ou désactiver : 200 + ETag
```

Les quatre opérations exigent le scope soignant et le suivi du patient. Une authentification absente ou invalide donne `401` ; un rôle ou scope insuffisant donne `403`. Un patient inexistant ou non suivi donne `404`.

Le contrôle du consentement reste à valider pour ces routes. Les succès avec un corps utilisent `application/json` ; les erreurs utilisent `application/problem+json`.

## Règles communes

- `typeMesure` vaut `FREQUENCE_CARDIAQUE`, `SPO2` ou `PAS`, enum commune aux alertes. `PAS` désigne les pas depuis le relevé précédent.
- `valeurMin <= valeurMax` : l’égalité est autorisée.
- Un seul seuil **actif** est autorisé par patient et type.
- Désactiver conserve le seuil dans l’historique.

Les identifiants des exemples sont illustratifs et ne fixent pas leur format API.

## Lister les seuils

`GET /patients/{patientId}/seuils` reçoit `patientId` dans le chemin et renvoie les seuils actifs et inactifs du patient.

```http
GET /patients/patient-001/seuils HTTP/1.1
Authorization: Bearer <jeton>
```

Chaque élément correspond à `Threshold`, décrit ci-dessous. L’enveloppe `ThresholdList` reste ouverte : aucun exemple de liste complète n’est imposé. Cette route n’a pas d’`ETag`.

**Réponses :** `200` pour la liste ; `401`, `403` et `404` selon les règles d’accès communes.

## Lire un seuil

`GET /patients/{patientId}/seuils/{seuilId}` reçoit les deux identifiants dans le chemin. Il renvoie le seuil et son `ETag`, nécessaire pour une modification ultérieure.

```http
GET /patients/patient-001/seuils/seuil-001 HTTP/1.1
Authorization: Bearer <jeton>
```

**Réponse `Threshold`**

```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "4b1f0c9e7a3d2e58"
```

```json
{
  "seuilId": "seuil-001",
  "patientId": "patient-001",
  "typeMesure": "FREQUENCE_CARDIAQUE",
  "valeurMin": 60,
  "valeurMax": 100,
  "actif": true
}
```

Ces six propriétés sont obligatoires : les identifiants relient le seuil au patient, `typeMesure` indique la mesure surveillée, les deux nombres définissent l’intervalle et `actif` est un booléen.

**Réponses prévues**

- `200` : seuil récupéré avec son `ETag`.
- `304` : `If-None-Match` correspond à l’état courant ; aucun corps.
- `401` / `403` : authentification ou permission insuffisante.
- `404` : patient inexistant ou non suivi, seuil inexistant ou rattaché à un autre patient.

Le [guide du cache](../cache/cache-contract.md) montre les échanges avec `If-None-Match`.

## Créer un seuil

`POST /patients/{patientId}/seuils` reçoit `patientId` dans le chemin et un corps `ThresholdCreate`.

```http
POST /patients/patient-001/seuils HTTP/1.1
Authorization: Bearer <jeton>
Content-Type: application/json
```

```json
{
  "typeMesure": "FREQUENCE_CARDIAQUE",
  "valeurMin": 60,
  "valeurMax": 100
}
```

Ces trois champs sont obligatoires et non nuls. Les propriétés inconnues sont refusées ; le backend vérifie aussi `valeurMin <= valeurMax`.

**Ne pas envoyer `seuilId`, `patientId` ou `actif` dans le corps.** Le backend attribue l’identifiant, prend le patient dans l’URL et active automatiquement le seuil. Ces champs seraient refusés comme propriétés inconnues.

Le `201` renvoie le même format `Threshold` que le GET individuel, avec `actif: true` et les en-têtes suivants :

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /patients/patient-001/seuils/seuil-001
ETag: "4b1f0c9e7a3d2e58"
```

`Location` désigne le GET individuel du seuil créé.

**Réponses prévues**

- `201` : seuil créé et actif.
- `400` : champ obligatoire absent, type invalide, valeur nulle, propriété inconnue ou minimum supérieur au maximum.
- `401` / `403` / `404` : règles d’accès communes.
- `409` : un seuil actif du même type existe déjà pour ce patient.

## Modifier un seuil

`PATCH /patients/{patientId}/seuils/{seuilId}` reçoit les deux identifiants et un corps `ThresholdPatch`.

L’en-tête `If-Match` est exigé. Il contient l’`ETag` obtenu au dernier GET, POST ou PATCH.

```http
PATCH /patients/patient-001/seuils/seuil-001 HTTP/1.1
Authorization: Bearer <jeton>
If-Match: "4b1f0c9e7a3d2e58"
Content-Type: application/json
```

```json
{
  "valeurMin": 55,
  "valeurMax": 110,
  "actif": true
}
```

Chaque champ est facultatif individuellement, mais au moins un doit être envoyé. Les champs absents gardent leur valeur ; le type de mesure, le patient et l’identifiant ne sont pas modifiables.

Le backend vérifie l’intervalle **après combinaison** avec les valeurs conservées. Avec un maximum à `100`, envoyer seulement `{"valeurMin": 110}` est refusé.

**Désactiver un seuil**

Sur la même route, avec le même en-tête `If-Match`, envoyer seulement :

```json
{
  "actif": false
}
```

Les bornes restent inchangées et le seuil est conservé. Le `200` renvoie le `Threshold` complet et l’`ETag` de l’état obtenu.

**Réponses prévues**

- `200` : seuil modifié, avec sa représentation et son `ETag`.
- `400` : corps vide, valeur nulle, type invalide, propriété inconnue ou bornes finales invalides.
- `401` / `403` : authentification ou permission insuffisante.
- `404` : patient inexistant ou non suivi, seuil inexistant ou d’un autre patient.
- `409` : activation en conflit avec un autre seuil actif du même type.
- `412` : `If-Match` ne correspond plus ; relire le seuil avant de réessayer.
- `428` : `If-Match` absent.

## Requêtes conditionnelles (ETag)

L’`ETag` est un validateur fort calculé depuis les six champs de `Threshold`, sans colonne de version. Il change lorsque la représentation change. Les comparaisons et exemples HTTP sont centralisés dans le [guide du cache](../cache/cache-contract.md).

**Écriture prévue côté backend**

Vérifier l’`ETag` puis écrire séparément laisserait une autre modification s’intercaler. Le PATCH devra utiliser une seule transaction :

```text
BEGIN
  SELECT … FOR UPDATE → verrouiller et lire le seuil ; absent : 404
  vérifier l’ETag     → différent de If-Match : 412
  valider et modifier → bornes invalides : 400 ; conflit actif : 409
COMMIT                → renvoyer le JSON et son ETag
```

Le mécanisme prévu utilise `READ COMMITTED`. Une écriture concurrente attend le verrou, puis relit l’état validé. Cette logique de Service reste à développer.

Le verrou d’une ligne ne protège pas deux seuils différents. L’index unique partiel `uq_seuil_actif_patient_type` garantit donc l’unicité sur `(id_patient, type_mesure) WHERE actif`. Une violation PostgreSQL `23505` devra être traduite en `409`.

Le SQL de la table, des contrôles de bornes et de l’index existe dans [CreateThresholds](../../backend/src/persistence/migrations/1794929035069-CreateThresholds.ts). Cela ne prouve pas que la migration a été appliquée sur chaque poste, ni que le PATCH ou le cache HTTP fonctionne.

## Points à valider

- Enveloppe de liste, types et formats des identifiants, unités et bornes numériques.
- Algorithme de l’`ETag`, sérialisation canonique et traitement de `If-Match: *`. L’`ETag` de collection n’est pas retenu.
- Consentement sur les seuils et contrôle dans la même transaction ; s’il est exigé, son absence donne `404`.
- Déclenchement d’une alerte aux bornes et modalités d’application de `actif` ; conserver plusieurs seuils inactifs du même type reste à préciser dans la conception.
- Modalités [OAuth/JWT](../security/components/security.yaml).

**Écart à arbitrer :** le consentement reste ouvert malgré l’exigence du sujet.

**Ordre contractuel retenu :** `401 → 403 → 404 → 428 → 412 → 400 ou 409`. Le raccordement de la validation et des préconditions devra le respecter ; il n’est pas prouvé par les tests actuels. Voir la [revue HTTP](../../docs/api-review.md#patch-patientspatientidseuilsseuilid).

Prism ne vérifie ni la comparaison des bornes, ni la persistance, ni les conflits.
