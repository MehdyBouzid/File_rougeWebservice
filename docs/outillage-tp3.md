# TP3 — Outillage du contrat OpenAPI

Ce guide explique comment vérifier et tester le contrat OpenAPI 3.1 de Veillo. Prérequis : Node.js 22 et `npx`, sans installation globale des outils.

## Rôle des outils

- **OpenAPI** décrit les endpoints, paramètres, données et réponses de l’API.
- **Spectral** vérifie le contrat et ses règles après chaque modification des sources et régénération du bundle.
- **Prism** simule l’API sans lancer le backend, une fois le contrat validé.
- **Bruno** envoie des requêtes au mock pour contrôler les statuts, les en-têtes et les corps, après le lancement de Prism.

`OpenAPI décrit → Spectral vérifie → Prism simule → Bruno appelle`

## 1. Organisation du contrat OpenAPI

Le découpage permet de retrouver les opérations par ressource et de maintenir les définitions communes à un seul endroit, sans parcourir un fichier unique volumineux.

Le fichier [openapi/openapi.yaml](../openapi/openapi.yaml) est le parent et le point d’entrée principal. Il contient les informations générales et les références vers les fichiers enfants. **Le parent et les fichiers enfants constituent ensemble les sources du contrat.**

### Opérations HTTP : `paths/`

Chaque fichier décrit les paramètres, corps de requête, réponses et règles contractuelles de ses opérations :

- [patients.yaml](../openapi/paths/patients.yaml) : liste et détail des patients suivis.
- [measurements.yaml](../openapi/paths/measurements.yaml) : ingestion des lots et consultation des mesures d’un patient.
- [alerts.yaml](../openapi/paths/alerts.yaml) : liste, détail et acquittement des alertes.
- [consents.yaml](../openapi/paths/consents.yaml) : consultation et retrait des consentements du patient connecté.
- [seuils.yaml](../openapi/paths/seuils.yaml) : consultation, création et modification des seuils d’un patient.

### Définitions réutilisables : `components/`

Les opérations réutilisent ces définitions au lieu de les recopier :

- [schemas.yaml](../openapi/components/schemas.yaml) : schémas JSON et contraintes déjà définies, avec les formats encore ouverts signalés.
- [responses.yaml](../openapi/components/responses.yaml) : réponses HTTP partagées, notamment l’erreur d’authentification et certaines ressources introuvables.
- [parameters.yaml](../openapi/components/parameters.yaml) : identifiants de chemin, filtres et pagination.
- [security.yaml](../openapi/components/security.yaml) : déclaration Bearer/JWT et choix OAuth restant ouverts.
- [examples.yaml](../openapi/components/examples.yaml) : exemples fictifs de réponses d’erreur.

Une correction dans une définition commune bénéficie ainsi à toutes les opérations qui la référencent.

### Lire une référence `$ref`

Dans le parent, cette référence sélectionne le bloc `ingestion` du fichier des mesures :

```yaml
$ref: "./paths/measurements.yaml#/ingestion"
```

Dans l’opération d’ingestion, le corps de requête réutilise le schéma `MeasurementBatch` :

```yaml
$ref: "../components/schemas.yaml#/MeasurementBatch"
```

Le chemin avant `#` est relatif **au fichier contenant la référence**, pas au terminal : `./` désigne son dossier et `../` remonte d’un dossier. Le fragment `#/` indique ensuite la définition à lire dans le fichier ciblé.

Les clés `ingestion`, `patientMeasurements`, `collection` et `item` désignent des blocs internes. Les URI restent déclarées dans le parent ; ces clés ne créent aucune route supplémentaire.

### Maintenance et validation

Le fichier [openapi.bundle.yaml](../openapi/openapi.bundle.yaml) regroupe le contrat dans un seul document. **Il est généré et ne doit pas être modifié manuellement.** Le découpage ne change ni les routes, ni les schémas, ni les règles métier.

1. Modifier une opération dans le fichier de sa ressource, sous `paths/`. Pour une nouvelle URI, ajouter aussi sa référence dans le parent.
2. Modifier un schéma JSON dans `components/schemas.yaml`, en conservant les références des opérations qui l’utilisent.
3. Régénérer le bundle et lancer les validations après chaque modification.

Le validateur OpenAPI 3.1 de Spectral installé rejette les `$ref` des blocs de chemins du parent. Le lint utilise donc le bundle, avec les mêmes règles. Redocly et Prism lisent directement le parent.

Depuis la racine du projet, générer le bundle puis le vérifier avec Spectral :

```bash
npx @redocly/cli bundle openapi/openapi.yaml -o openapi/openapi.bundle.yaml
npx @stoplight/spectral-cli lint openapi/openapi.bundle.yaml --ruleset openapi/.spectral.yaml
```

La validation du parent avec Redocly est décrite en section 2. Pour tester les échanges, utiliser le parent avec [Prism](#3-mock-prism).

Lors du contrôle du découpage, Spectral a relevé **0 erreur et 0 avertissement** sur le bundle.

Les règles métier validées sont décrites dans [design.md](design.md), [api.md](api.md) et [api-review.md](api-review.md). Les évolutions du contrat doivent rester cohérentes avec ces documents.

La proposition actuelle du JSON d’ingestion impose `patientId`, `batchId` et `measurements` dans le YAML. Les types d’identifiants, les champs précis des relevés et l’autorisation du simulateur restent à valider ; le découpage ne tranche pas ces questions.

## 2. Documentation Redocly

Depuis la racine, valider le fichier parent et générer la documentation HTML :

```bash
npx @redocly/cli lint openapi/openapi.yaml
npx @redocly/cli build-docs openapi/openapi.yaml -o docs/index.html
```

La seconde commande génère un fichier HTML autonome, ouvrable dans un navigateur. Elle est documentée mais n’a pas été exécutée lors de cette mise à jour ; le fichier [docs/index.html](index.html) présent dans le dépôt est actuellement vide.

La dernière validation Redocly a relevé **0 erreur et 2 avertissements** : licence absente (`info-license`) et serveur local (`no-server-example.com`).

## 3. Mock Prism

Depuis la racine, démarrer le mock sur `http://127.0.0.1:4010` :

```bash
npx @stoplight/prism-cli mock openapi/openapi.yaml
```

Lors du contrôle du découpage, les contrats avant et après ont été comparés avec deux instances temporaires de Prism : **118 appels HTTP**, couvrant les 12 succès, 43 erreurs forcées et 4 cas de requêtes invalides, ont donné des résultats identiques. Ce contrôle vérifie les échanges simulés, pas l’implémentation des règles métier dans NestJS.

## 4. Client Bruno

Les requêtes sont dans [bruno/tp3-mock/](../bruno/tp3-mock/). L’environnement [mock.bru](../bruno/environments/mock.bru) fournit `baseUrl = http://127.0.0.1:4010`, `patientId` et un `token` factice.

Avec Prism démarré, exécuter depuis le dossier `bruno/` :

```bash
npx @usebruno/cli run tp3-mock --env mock
```

**La collection Bruno n’a pas été réexécutée après le découpage.** Les blocs suivants décrivent les réponses attendues.

**01 — Liste des patients (`listPatients`)**

`GET /patients` doit répondre `200 OK`. La structure JSON reste ouverte : l’assertion Bruno exigeant `items` et `pagination` peut échouer même si le mock respecte le contrat.

**02 — Création d’un seuil (`createPatientThreshold`)**

`POST /patients/{patientId}/seuils` doit répondre `201 Created`, avec un en-tête `Location`.

**03 — Lot invalide (`ingestMeasurements`)**

`POST /measurements` doit répondre `400 Bad Request` en `application/problem+json`, car le corps omet `patientId`, obligatoire dans le YAML actuel.

La note du fichier Bruno sur le format UUID de `batchId` et la SpO₂ limitée à 100 est obsolète : ces contraintes ne figurent pas dans le contrat.

### Que renvoie Prism pour un corps invalide ?

Prism compare la requête au contrat. Les violations se consultent dans l’en-tête `sl-violations`. Pour la requête 03, la réponse utilise l’exemple `BadRequest` de [components/examples.yaml](../openapi/components/examples.yaml), avec le schéma `Problem`.

Le corps renvoyé est l’**exemple statique** du contrat. Son `detail` ne décrit donc pas la vraie erreur. Le backend devra produire un détail adapté à la validation réellement effectuée.

Sans en-tête `Authorization: Bearer …`, Prism répond **401**. Il ne vérifie ni la signature des JWT ni les autorisations métier.

La capture attendue sous `docs/mock.png` n’est pas présente dans le dépôt.
