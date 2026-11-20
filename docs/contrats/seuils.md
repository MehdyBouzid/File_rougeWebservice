# Contrats API — Seuils

Un seuil fixe les limites (`valeurMin`, `valeurMax`) qui déclenchent une alerte pour un type de mesure d’un patient. Les quatre opérations sont réservées au soignant (scope soignant) pour un patient qu’il suit ; un patient non suivi est traité comme inexistant (`404`). Ce guide décrit le contrat attendu, pas une implémentation.

Sources : [opérations seuils](../../openapi/paths/seuils.yaml) et [schémas JSON](../../openapi/components/schemas.yaml). Les succès utilisent `application/json` et les erreurs `application/problem+json`. Le détail de `ETag`, `If-Match` et `304` est dans le [guide du cache](cache.md).

## Vue d’ensemble

```text
POST  /patients/{patientId}/seuils             créer un seuil        → 201 + ETag
GET   /patients/{patientId}/seuils             lister les seuils     → 200
GET   /patients/{patientId}/seuils/{seuilId}   lire un seuil         → 200 + ETag (ou 304)
PATCH /patients/{patientId}/seuils/{seuilId}   modifier / désactiver → 200 + nouvel ETag
```

Le seuil a six champs : `seuilId`, `patientId`, `typeMesure` (`FREQUENCE_CARDIAQUE`, `SPO2` ou `PAS`), `valeurMin`, `valeurMax` et `actif`. L’enum `typeMesure` est commune aux alertes ; `PAS` désigne les pas depuis le relevé précédent.

Règles à retenir :

- `valeurMin <= valeurMax` (l’égalité est autorisée), contrôlé par le backend.
- Un seul seuil **actif** par patient et par type de mesure.
- Désactiver un seuil le conserve dans l’historique.

## Lister les seuils

`GET /patients/{patientId}/seuils` renvoie les seuils du patient, actifs ou non. Chaque élément est un `Threshold` ; l’enveloppe de la liste reste à définir. Cette liste n’a pas d’`ETag`.

- `200` : seuils récupérés.
- `401` : authentification absente ou invalide.
- `403` : scope soignant manquant.
- `404` : patient inexistant ou non suivi.

## Lire un seuil

`GET /patients/{patientId}/seuils/{seuilId}` sert à obtenir un seuil **et son `ETag`**, nécessaire pour le modifier ensuite. C’est aussi l’adresse renvoyée dans `Location` à la création.

```http
GET /patients/patient-001/seuils/seuil-001 HTTP/1.1
Authorization: Bearer <jeton>
```

```http
HTTP/1.1 200 OK
ETag: "4b1f0c9e7a3d2e58"

{"seuilId":"seuil-001","patientId":"patient-001","typeMesure":"FREQUENCE_CARDIAQUE","valeurMin":60,"valeurMax":100,"actif":true}
```

- `200` : seuil récupéré, avec `ETag`.
- `304` : `If-None-Match` correspond à l’état courant, sans corps.
- `401` / `403` : comme ci-dessus.
- `404` : patient inexistant ou non suivi, seuil inexistant ou rattaché à un autre patient.

## Créer un seuil

`POST /patients/{patientId}/seuils` avec trois champs obligatoires, sans valeur nulle ni champ en plus :

```http
POST /patients/patient-001/seuils HTTP/1.1
Authorization: Bearer <jeton>
Content-Type: application/json

{"typeMesure":"FREQUENCE_CARDIAQUE","valeurMin":60,"valeurMax":100}
```

```http
HTTP/1.1 201 Created
Location: /patients/patient-001/seuils/seuil-001
ETag: "4b1f0c9e7a3d2e58"

{"seuilId":"seuil-001","patientId":"patient-001","typeMesure":"FREQUENCE_CARDIAQUE","valeurMin":60,"valeurMax":100,"actif":true}
```

Pourquoi ne pas envoyer `seuilId`, `patientId` ni `actif` ? Le backend attribue `seuilId`, le patient vient du chemin, et `actif` vaut toujours `true` à la création. Ces trois champs sont donc interdits dans le corps. Les identifiants de l’exemple sont illustratifs.

- `201` : seuil créé, avec `Location` et `ETag`.
- `400` : champ obligatoire absent, type invalide, valeur nulle, champ inconnu ou minimum supérieur au maximum.
- `401` / `403` / `404` : comme ci-dessus.
- `409` : un seuil actif du même type existe déjà pour ce patient.

## Modifier un seuil

`PATCH /patients/{patientId}/seuils/{seuilId}` change les bornes ou l’état. L’en-tête `If-Match` est **exigé** : on y met l’`ETag` du dernier `GET`, `POST` ou `PATCH`.

```http
PATCH /patients/patient-001/seuils/seuil-001 HTTP/1.1
Authorization: Bearer <jeton>
If-Match: "4b1f0c9e7a3d2e58"
Content-Type: application/json

{"valeurMin":55,"valeurMax":110,"actif":true}
```

Le corps accepte `valeurMin`, `valeurMax` et `actif`, chacun facultatif mais avec au moins un champ. `{}`, les valeurs nulles et les champs inconnus sont refusés. Le type de mesure, le patient et l’identifiant ne sont pas modifiables. Les champs absents gardent leur valeur.

Le backend contrôle l’intervalle **final** : avec un maximum à `100`, envoyer seulement `valeurMin: 110` est refusé. Pour désactiver un seuil, il suffit d’envoyer `{"actif": false}` ; les bornes restent inchangées.

- `200` : seuil modifié (`Threshold` complet) avec le nouvel `ETag`.
- `400` : corps vide, valeur nulle, type invalide, champ inconnu ou bornes finales invalides.
- `401` / `403` : comme ci-dessus.
- `404` : patient inexistant ou non suivi, seuil inexistant ou d’un autre patient.
- `409` : l’activation entrerait en conflit avec un autre seuil actif du même type.
- `412` : `If-Match` ne correspond plus ; relire le seuil puis réessayer.
- `428` : `If-Match` absent.

## Requêtes conditionnelles (ETag)

Le formateur exige `ETag`, `If-None-Match`, `If-Match`, `304`, `412` et `428` pour les seuils. Le contrat les déclare sur `GET` et `PATCH` d’un seuil, et l’`ETag` sur le `201` du `POST`. L’explication complète (parcours, exemples, ordre des contrôles) est dans le [guide du cache](cache.md). Ici, seulement ce qui concerne le futur backend.

**L’`ETag`.** C’est un validateur fort calculé depuis la représentation complète `Threshold` (les six champs), sans colonne de version ni changement du MCD ou de la BDD. Il change dès que `valeurMin`, `valeurMax` ou `actif` change.

**Comparaisons (RFC 9110).** `If-Match` utilise la comparaison forte, `If-None-Match` la comparaison faible.

**Atomicité (mécanisme backend futur, non implémenté, migrations inchangées).** Vérifier l’`ETag` puis écrire en deux temps laisserait une autre écriture s’intercaler. Le `PATCH` devra donc tout faire dans une seule transaction PostgreSQL :

```text
BEGIN
  SELECT … FOR UPDATE   → verrouille le seuil (aucune ligne : 404)
  recalcul de l'ETag    → différent de If-Match : 412
  validation + UPDATE   → bornes finales (400), unicité (409)
COMMIT                  → nouvel ETag renvoyé au client
```

Une seconde modification concurrente du même seuil attend le verrou, relit la ligne validée par la première et obtient `412`. Le niveau `READ COMMITTED` suffit, car la ligne est relue après l’obtention du verrou.

Le verrou de ligne ne protège pas l’unicité entre deux seuils différents : deux activations concurrentes du même patient et du même type verrouillent deux lignes distinctes. Cette règle sera garantie par un **index unique partiel** sur le patient et le type de mesure, limité aux seuils actifs (`UNIQUE (patient, type_mesure) WHERE actif`, noms physiques à adapter au schéma). Une violation (`unique_violation`, SQLSTATE `23505`) est traduite en `409`, pour le `POST` comme pour une activation. La migration `CreateThresholds` reste un squelette et n’est pas modifiée.

## Points à valider

**[À VALIDER]**

- Enveloppe de la liste des seuils, types et formats des identifiants, unités et bornes numériques.
- Algorithme exact et sérialisation canonique de l’`ETag`, traitement de `If-Match: *`, `ETag` sur la liste (non retenu pour l’instant).
- `400` de structure (JSON mal formé, corps vide, champ inconnu) avant ou après `428` et `412`.
- Contrôle du consentement pour les seuils, y compris dans la même transaction ; s’il est retenu, son absence renvoie `404`.
- Règles de déclenchement aux bornes, non décidées par la validation de l’intervalle.
- Modalités OAuth/JWT : voir la [définition de sécurité](../../openapi/components/security.yaml).

Prism ne prouve ni la comparaison des bornes, ni la persistance, ni les conflits : ses exemples sont statiques.
