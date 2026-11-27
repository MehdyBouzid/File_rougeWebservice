# Backend Veillo — Infrastructure NestJS

Ce guide explique où développer et comment lancer le backend. Les six ressources sont enregistrées dans `AppModule`.

- **Mehdy :** `patients`, `thresholds` et `consents`.
- **Ethan :** `measurements`, `alerts` et `caregivers`.

L’[architecture du backend](architecture-backend.md) décrit les modules, leurs dépendances et le cheminement HTTP.

Les [choix techniques](../CHOIX_TECHNIQUES.md) justifient les technologies retenues. Les [guides métier](../openapi/architecture-api.md) et les [sources OpenAPI](../openapi/openapi.yaml) définissent les échanges à respecter.

## Routes et traitements présents

Patients, Seuils et Consentements restent des squelettes. OAuth/JWT et le raccordement des contrôles d’accès aux routes restent à réaliser.

Les cinq routes codées sont `POST /measurements`, `GET /patients/{patientId}/measurements`, `GET /alerts`, `GET /alerts/{alertId}` et `PATCH /alerts/{alertId}`. Leur sécurité HTTP reste à raccorder.

Le service Soignants contient des contrôles de suivi et de consentement, sans endpoint dédié en V1 : voir le [contrat Soignants](../openapi/caregivers/caregivers-contract.md). Leur présence ne protège pas encore les routes HTTP.

## Environnement technique

Technologies présentes, selon [package.json](package.json) :

- **Node.js `22.x` et npm** ([.nvmrc](.nvmrc) indique `22`).
- **NestJS `^11.0.1`**, avec Express, et **TypeScript `^5.7.3`**.
- **Jest `^30.0.0` et Supertest `^7.0.0`** pour les tests.
- **ESLint `^9.18.0` et Prettier `^3.4.2`** pour la qualité du code.
- **TypeORM et le pilote PostgreSQL `pg`**, ainsi que `class-validator` et `class-transformer` pour la validation des DTO.
- Dépendances complémentaires : `reflect-metadata` (`^0.2.2`) et RxJS (`^7.8.1`).

Ces versions sont les contraintes déclarées, pas un relevé des versions installées. [package-lock.json](package-lock.json) verrouille les dépendances utilisées par `npm ci`.

## Prérequis

Toutes les commandes partent de la racine du dépôt.

- **Avec Docker :** Docker Desktop démarré et `.env` renseigné.
- **Hors conteneur :** Node.js 22, npm et PostgreSQL démarré.
- Conserver le `.env` existant ; [.env.example](../.env.example) décrit les variables sans secret réel.

## Démarrer avec Docker

Créer `.env` seulement s’il manque, renseigner `DB_PASSWORD`, puis construire et démarrer les services :

```bash
[ -f .env ] || cp .env.example .env
# Renseigner DB_PASSWORD dans .env avant le premier démarrage.
docker compose up -d --build
```

Le backend utilise le port hôte `BACKEND_PORT`, par défaut `3000`. Aucune route n’est déclarée à la racine : `GET /` répond `404`.

Les ports, logs, accès PostgreSQL et migrations sont centralisés dans le [guide Docker](../docs/docker.md).

## Développer hors conteneur

PostgreSQL reste démarré. Arrêter seulement le backend Docker avant de réutiliser son port, puis installer les dépendances et lancer NestJS :

```bash
docker compose stop backend
npm --prefix backend ci
npm --prefix backend run persistence:sync
(cd backend && node --env-file=../.env node_modules/@nestjs/cli/bin/nest.js start --watch)
```

Cette commande charge le `.env` racine. Depuis l’hôte, `DB_HOST` et `DB_PORT` ciblent PostgreSQL via son port publié ; dans Docker, Compose fournit `postgres:5432`. NestJS écoute sur `PORT`, ou `3000` par défaut.

## Travailler dans une ressource

Pour les dossiers, les responsabilités, les dépendances entre modules et le parcours HTTP, suivre l’[architecture backend](architecture-backend.md#modules-et-couches). Les étapes pour [ajouter une fonctionnalité](architecture-backend.md#ajouter-une-fonctionnalité) y sont regroupées.

## Validation des entrées

Le [ValidationPipe global](src/validation.pipe.ts) est raccordé dans [main.ts](src/main.ts). Les DTO d’entrée de Mesures et Alertes utilisent les décorateurs `class-validator` ; une classe TypeScript seule ne suffit pas.

La configuration rejette les propriétés inconnues (`whitelist` et `forbidNonWhitelisted`), active `transform` et désactive les conversions implicites. Les erreurs passent par le gestionnaire global décrit ci-dessous.

## Validation OpenAPI des réponses

[main.ts](src/main.ts) branche `express-openapi-validator` avec le [bundle](../openapi/openapi.bundle.yaml). L’objectif est de détecter une réponse JSON différente du contrat avant son envoi, sans recopier les contraintes dans un autre schéma.

Le [flux HTTP](architecture-backend.md#cheminement-dune-requête) situe ce contrôle par rapport au Controller et au filtre d’erreurs.

**Configuration active :**

- `validateResponses: true` : contrôler les réponses JSON interceptées et leurs statuts.
- `validateRequests: false` : laisser les entrées au ValidationPipe et aux DTO existants.
- `validateSecurity: false` : laisser la sécurité aux mécanismes NestJS, sans fournir leur implémentation.
- `fileUploader: false` : ne pas activer le traitement des fichiers envoyés.
- `ignoreUndocumented: true` : laisser NestJS gérer les chemins et méthodes absents du contrat.

Les réponses ne sont ni corrigées ni nettoyées automatiquement. Les écarts entre DTO et OpenAPI restent à arbitrer ; par exemple, le DTO des mesures impose des entiers et des bornes absents du schéma. Le branchement ne modifie pas ces contraintes.

**Bundle et Docker :** régénérer puis valider le fichier après une modification des sources selon le [guide du bundle](../openapi/bundle.md#générer-et-mettre-à-jour). Compose le monte en lecture seule dans `/openapi/openapi.bundle.yaml` ; il n’est pas inclus dans l’image seule.

Les [tests HTTP ciblés](test/e2e/openapi-responses.e2e-spec.ts) utilisent le vrai bundle et des Controllers réservés aux tests, sans PostgreSQL :

```bash
npm --prefix backend run test:e2e -- --runInBand openapi-responses.e2e-spec.ts
```

Ils vérifient les réponses conformes ou invalides, les erreurs RFC 9457, les routes non documentées et le passage des réponses `204/304` sans corps. Ils ne prouvent ni les autorisations ni l’ordre métier des contrôles. [Schemathesis](../docs/tests/schemathesis.md) reste complémentaire pour tester le backend de l’extérieur.

**Limites vérifiées ou relevées dans la bibliothèque :**

- Les headers sortants ne sont pas garantis : le test d’un `201` sans `Location` réussit.
- Le passage des `204/304` sans corps ne prouve pas leur validation complète.
- Les schémas ouverts, comme certaines enveloppes de listes, restent peu contrôlés.
- Le hook JSON natif ignore les réponses `5xx`. Le filtre produit néanmoins un `500` RFC 9457 lorsqu’une autre réponse échoue à la validation.
- Aucun contrôle de suivi, de consentement, de transaction ou d’ordre des erreurs n’est fourni.

**Essai du 26 novembre 2026 :** 16 tests ciblés réussis. L’image Docker a été construite ; un conteneur temporaire a vérifié le bundle, un `200` conforme, un JSON invalide bloqué en `500` RFC 9457 et une route absente en `404` RFC 9457. Ce module technique n’accède pas à PostgreSQL et ne prouve pas le fonctionnement métier du backend complet.

## Erreurs HTTP

[ProblemDetailsFilter](src/common/http/problem-details.filter.ts) est enregistré globalement dans [main.ts](src/main.ts). Il construit les réponses `application/problem+json` prévues pour les erreurs RFC 9457.

**Comportement du code actuel :**

- `type` utilise une URI stable sous `https://veillo.local/errors`, avec les catégories `validation`, `not-found`, `conflict` et `internal-error`. Les autres statuts utilisent `http-<statut>`.
- Les réponses peuvent inclure `detail` et `instance`. Le champ `errors` précise les erreurs de validation `400`.
- Pour les erreurs `500`, les traces sont consignées côté serveur ; elles ne sont pas renvoyées au client.

Ce gestionnaire ne fournit pas l’authentification. OAuth/JWT, les scopes et le raccordement des contrôles métier aux appels HTTP restent à intégrer.

## Pagination

Les consultations des mesures et des alertes utilisent une pagination **par offset** : le code saute `page × size` lignes, puis lit la page demandée. Cela permet d’accéder directement à une page.

**Paramètres définis dans [OpenAPI](../openapi/common/components/parameters/parameters.yaml) :**

- `page` commence à `0`, avec `0` par défaut.
- `size` vaut `50` par défaut ; au-delà de `100`, la requête est refusée avec `400`.

**Choix présents dans le code, encore à valider dans le contrat :**

- Les réponses contiennent `items`, `page`, `size`, `totalItems`, `totalPages` et `links`.
- Le tri est déterministe : `horodatage DESC`, puis identifiant de mesure ou d’alerte `ASC`.
- `links` contient `self`, `next` et `prev`, avec les filtres actifs. Le [générateur de liens](src/common/http/pagination.util.ts) renvoie `null` lorsqu’il n’existe pas de page suivante ou précédente.

Les [DTO Mesures](src/features/measurements/dto/measurement-response.dto.ts) et [DTO Alertes](src/features/alerts/dto/alert-response.dto.ts) décrivent ces réponses. Les schémas `MeasurementPage` et `AlertPage` restent ouverts dans les [contrats OpenAPI](../openapi/architecture-api.md) : l’implémentation ne vaut pas validation de ces formats ou du tri.

## Enregistrement des entités

Le [registre généré](src/persistence/feature-entities.generated.ts) alimente `TypeOrmModule.forFeature(...)` dans chaque ressource. Il enregistre actuellement `MeasurementBatch`, `Measurement`, `Alert` et `Caregiver`. Les listes Patients, Seuils et Consentements restent vides.

Le [générateur](scripts/sync-feature-entities.mjs) recherche les fichiers `*.entity.ts`, y compris dans les sous-dossiers. Il reconnaît les classes avec export nommé et décorateur `@Entity()` ou `@ViewEntity()`, importé par nom depuis `typeorm` ; les alias d’import sont acceptés.

Après ajout ou renommage d’une Entity pendant le mode watch :

```bash
npm --prefix backend run persistence:sync
npm --prefix backend run persistence:check
```

`sync` écrit le registre si nécessaire ; `check` vérifie sans écrire. Redémarrer ensuite le serveur. Modifier les champs d’une Entity déjà enregistrée ne demande pas de modifier les modules.

Les hooks de `build`, `start`, `start:dev` et `test` synchronisent aussi le registre. Ne pas l’éditer à la main : le script lit les sources sans les exécuter et ne crée aucune table.

Le mécanisme couvre les six ressources et la connexion par défaut. `EntitySchema`, imports namespace, connexions nommées et réexports ne sont pas pris en charge.

## PostgreSQL et migrations

[DatabaseModule](src/persistence/database.module.ts) et le pilote `pg` configurent la connexion. Les tables sont créées par les migrations, indépendamment de l’enregistrement des Entities.

Les sept migrations présentes contiennent du SQL pour les ressources et leurs associations. Consentements nécessite Patient et Soignant ; `recevoir` nécessite Soignant et Alerte. Vérifier les dépendances et l’historique local avant toute application : la présence du SQL ne prouve pas son exécution sur chaque base.

La configuration partagée conserve `synchronize: false` et `migrationsRun: false`. Le [guide des migrations](../docs/docker.md#migrations-typeorm) explique création, génération, statut et application.

## Build et tests

```bash
npm --prefix backend run build
npm --prefix backend test
npm --prefix backend run test:infrastructure
```

Ces commandes doivent terminer sans erreur. Examiner les suites et le nombre de tests : `test:integration` utilise `--passWithNoTests` et peut réussir sans test métier.

Des tests unitaires couvrent les DTO, Controllers et Services de Mesures et Alertes, ainsi que le service Soignants et le filtre d’erreurs. Les tests du socle remplacent le module de connexion et les tests de Services utilisent des doubles de persistance : ils ne prouvent pas le fonctionnement avec PostgreSQL.

Le dossier `test/integration/` ne contient encore qu’un `.gitkeep`. Les tests d’écriture sur le backend nécessiteront une base isolée ; voir [Schemathesis](../docs/tests/schemathesis.md#passer-au-backend-nestjs).

## Consultation et preuves historiques

Les commandes suivantes ont été consignées dans un audit antérieur comme consultations sans changement de données. Elles n’ont pas été rejouées pour cette révision :

```bash
docker compose config --quiet
docker compose ps -a
docker compose logs --tail=30 backend postgres
docker compose exec -T backend sh -c 'pwd; node --version'
docker compose exec -T -e PGOPTIONS='-c default_transaction_read_only=on' postgres sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\l" -c "\dt public.*"'
npm --prefix backend run migration:check
docker compose exec -T -e PGOPTIONS='-c default_transaction_read_only=on' backend npm run migration:show
```

`exec backend` nécessite un conteneur backend démarré et une image à jour. Un ancien audit utilisait une image sans migrations compilées : un statut vide ne prouve pas l’absence de fichiers sources.

En lecture seule, TypeORM peut échouer si l’historique `veillo_migrations` n’existe pas encore et qu’il tente de le créer. Les commandes usuelles et leurs prérequis figurent dans le [guide Docker](../docs/docker.md#10-état-actuel-et-limites).

Aucun démarrage, arrêt, build, test applicatif ou migration n’a été exécuté pendant cette révision documentaire.
