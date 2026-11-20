# TP3 — Outillage du contrat OpenAPI

Ce guide permet de valider le contrat OpenAPI 3.1 et de tester ses échanges sans backend. Prérequis : Node.js 22 et `npx`, sans installation globale ; le premier lancement peut télécharger les outils.

## Rôle des outils

- **OpenAPI** décrit les endpoints, paramètres, données et réponses de l’API.
- **Spectral** vérifie le contrat et ses règles après modification des sources et régénération du bundle.
- **Prism** simule l’API à partir du contrat validé, sans lancer NestJS.
- **Bruno** appelle le mock Prism pour contrôler les statuts, les en-têtes et les corps.

Flux : `openapi.yaml → Spectral → Prism → Bruno`.

## 1. Organisation du contrat OpenAPI

Le découpage regroupe les opérations par ressource et évite de dupliquer les définitions communes.

Le parent [openapi/openapi.yaml](../openapi/openapi.yaml) est le point d’entrée : informations générales, URI et références aux fichiers enfants. **L’ensemble constitue les sources du contrat.**

### Opérations HTTP : `paths/`

Ces fichiers décrivent les paramètres, corps, réponses et règles des opérations :

- [patients.yaml](../openapi/paths/patients.yaml) : liste et détail des patients suivis.
- [measurements.yaml](../openapi/paths/measurements.yaml) : ingestion des lots et consultation des mesures d’un patient.
- [alerts.yaml](../openapi/paths/alerts.yaml) : liste, détail et acquittement des alertes.
- [consents.yaml](../openapi/paths/consents.yaml) : consultation et retrait des consentements du patient connecté.
- [seuils.yaml](../openapi/paths/seuils.yaml) : liste, détail, création et modification conditionnelle (`ETag`, `If-Match`) des seuils d’un patient.

### Définitions réutilisables : `components/`

Les opérations réutilisent ces définitions au lieu de les recopier :

- [schemas.yaml](../openapi/components/schemas.yaml) : schémas JSON, contraintes définies et formats encore ouverts.
- [responses.yaml](../openapi/components/responses.yaml) : réponses partagées `401`, `403` (scope insuffisant) et `404` (inexistant ou hors périmètre) ; les réponses `304`, `412` et `428` sont dans `cache.yaml`.
- [parameters.yaml](../openapi/components/parameters.yaml) : identifiants de chemin, filtres et pagination ; les en-têtes `If-Match` et `If-None-Match` sont dans `cache.yaml`.
- [cache.yaml](../openapi/components/cache.yaml) : composants du cache HTTP et des requêtes conditionnelles des seuils (`ETag`, `If-Match`, `If-None-Match`, réponses `304`, `412` et `428`), regroupés par type (`headers`, `parameters`, `responses`, `examples`).
- [security.yaml](../openapi/components/security.yaml) : déclaration Bearer/JWT ; les scopes provisoires `montre`, `patient` et `soignant` sont indiqués par opération dans `security`. Fournisseur et flux OAuth restent ouverts.
- [examples.yaml](../openapi/components/examples.yaml) : exemples fictifs de réponses d’erreur.

### Lire une référence `$ref`

Le parent sélectionne le bloc `ingestion` :

```yaml
$ref: "./paths/measurements.yaml#/ingestion"
```

L’ingestion réutilise le schéma `MeasurementBatch` pour son corps JSON :

```yaml
$ref: "../components/schemas.yaml#/MeasurementBatch"
```

Le chemin avant `#` est relatif **au fichier contenant la référence** : `./` désigne son dossier et `../` remonte d’un dossier. Après `#`, le chemin `/MeasurementBatch` sélectionne cette définition à la racine du fichier ciblé.

Les clés `ingestion`, `patientMeasurements`, `collection` et `item` sont des blocs internes, pas des URI supplémentaires.

### Maintenance et validation

Le [bundle](../openapi/openapi.bundle.yaml) regroupe les sources dans un seul document, sans changer le contrat. **Il est généré et ne doit pas être modifié manuellement.**

1. Modifier les opérations dans `paths/` ; une nouvelle URI nécessite aussi une référence dans le parent.
2. Modifier les schémas dans `components/schemas.yaml`, en conservant leurs références.
3. Régénérer le bundle, lancer Spectral, puis Redocly (section 2).

Dans la configuration actuelle, Spectral rejette les `$ref` des blocs de chemins du parent. Il valide donc le bundle avec [`.spectral.yaml`](../openapi/.spectral.yaml). Redocly et Prism lisent directement le parent.

Depuis la racine du projet, générer le bundle puis le vérifier avec Spectral :

```bash
npx @redocly/cli bundle openapi/openapi.yaml -o openapi/openapi.bundle.yaml
npx @stoplight/spectral-cli lint openapi/openapi.bundle.yaml --ruleset openapi/.spectral.yaml
```

Vérifier la génération du bundle et l’absence d’erreur Spectral ; examiner les avertissements. La règle native `oas3-operation-security-defined` est désactivée dans `.spectral.yaml` : OpenAPI 3.1 autorise des noms de rôles pour un schéma Bearer, alors qu’elle exige des scopes OAuth, donc un flux non décidé. Elle est remplacée par la règle `security-roles-known`, qui limite les scopes de chaque opération à `montre`, `patient` et `soignant` et détecte une faute de frappe.

**Expérience OAuth2, non retenue dans le contrat.** Sur une copie jetable, un seul schéma `oauth2` déclarant deux flux (`authorizationCode` pour patient et soignant, `clientCredentials` pour montre) avec des URLs fictives a passé Redocly, Spectral avec la règle native réactivée (elle détecte alors un scope inconnu) et Prism. Aucun flux ni URL n’est figé dans le contrat : le choix des flux et du fournisseur reste à valider. Le passage à `oauth2` n’exigera ensuite que de modifier `security.yaml`.

**Résultat historique du découpage : 0 erreur, 0 avertissement Spectral**, avant les évolutions des schémas Mesures et Alertes.

Les règles établies et les décisions ouvertes sont décrites dans [design.md](design.md), [api.md](api.md) et [api-review.md](api-review.md).

Le [guide des mesures](contrats/mesures.md) détaille le JSON d’ingestion retenu et son exemple. **[À VALIDER]** Types et formats d’identifiants, unités, bornes numériques et modalités d’autorisation du simulateur.

## 2. Documentation Redocly

Depuis la racine, valider le fichier parent et générer la documentation HTML :

```bash
npx @redocly/cli lint openapi/openapi.yaml
npx @redocly/cli build-docs openapi/openapi.yaml -o docs/index.html
```

Vérifier l’absence d’erreur et examiner les avertissements, puis ouvrir le HTML généré dans un navigateur.

**Résultat déjà consigné : 0 erreur, 2 avertissements** (licence absente, `info-license` ; serveur local, `no-server-example.com`). La génération HTML n’a pas été exécutée lors de cette révision ; [index.html](index.html) est vide.

## 3. Mock Prism

Depuis la racine, démarrer le mock sur `http://127.0.0.1:4010` :

```bash
npx @stoplight/prism-cli mock openapi/openapi.yaml
```

Prism doit afficher les **13 opérations** et son adresse d’écoute. Garder ce terminal ouvert pendant les appels ; `Ctrl+C` arrête le mock.

**Résultat historique : 118 appels HTTP identiques avant/après découpage**, soit 12 succès, 43 erreurs forcées et 4 requêtes invalides par version. Ce contrôle précède les schémas actuels des relevés et des alertes. Il ne valide ni ces évolutions ni l’implémentation métier de NestJS.

## 4. Client Bruno

Les requêtes sont dans [bruno/tp3-mock/](../bruno/tp3-mock/). L’environnement [mock.bru](../bruno/environments/mock.bru) fournit `baseUrl = http://127.0.0.1:4010`, `patientId` et un `token` factice.

Avec Prism démarré, exécuter depuis le dossier `bruno/` :

```bash
npx @usebruno/cli run tp3-mock --env mock
```

**La collection complète n’a pas été réexécutée après le découpage.** Une vérification ciblée des seuils sur le contrat actuel a réussi : **5 requêtes et 11 tests**, via Prism. Elle couvre la création, le PATCH et le rejet d’un corps vide, d’une valeur nulle ou d’une propriété inconnue.

Les requêtes 01 et 03 ci-dessous n’ont pas été rejouées lors de cette vérification :

- **01 — `listPatients`**, `GET /patients` : `200 OK`. **[À VALIDER]** Le JSON de liste reste ouvert ; l’assertion `items` et `pagination` peut échouer sans violation du contrat par le mock.
- **02 — `createPatientThreshold`**, `POST /patients/{patientId}/seuils` : `201 Created` avec `Location` et une réponse `Threshold` contenant `seuilId`, `patientId`, `typeMesure`, les bornes et `actif: true`.
- **03 — `ingestMeasurements`**, `POST /measurements` : `400 Bad Request` en `application/problem+json`, car `patientId` est absent.
- **04 à 07 — `updatePatientThreshold`**, `PATCH /patients/{patientId}/seuils/{seuilId}` : `200 OK` pour le corps valide, puis `400 Bad Request` en `application/problem+json` pour les trois corps invalides.

Le [guide des seuils](contrats/seuils.md) détaille le JSON et l’enum commune aux alertes. Prism vérifie les contraintes de schéma, mais pas `valeurMin <= valeurMax`, l’unicité du seuil actif ou la persistance. Ses exemples statiques ne reflètent pas automatiquement les valeurs reçues.

La note du fichier Bruno sur le format UUID de `batchId` et la SpO₂ limitée à 100 est obsolète : ces contraintes ne figurent pas dans le contrat.

### Que renvoie Prism pour un corps invalide ?

L’en-tête `sl-violations` indique les violations du contrat. Pour la requête 03, Prism utilisait l’exemple `BadRequest` de [examples.yaml](../openapi/components/examples.yaml), conforme à `Problem`. Ce corps statique ne décrit pas l’erreur réelle dans `detail` ; le backend devra produire un détail adapté.

Sans en-tête `Authorization: Bearer …`, Prism répond **401**. Il ne vérifie ni la signature des JWT ni les autorisations métier.

La capture attendue sous `docs/mock.png` n’est pas présente dans le dépôt.
