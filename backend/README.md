# Backend Veillo — Infrastructure NestJS

Ce guide explique où développer et comment lancer le socle. Les six ressources sont enregistrées dans `AppModule` ; leurs Controllers et Services ne portent encore aucune route ni règle métier.

- **Mehdy :** `patients`, `thresholds` et `consents`.
- **Ethan :** `measurements`, `alerts` et `caregivers`.

Les [choix techniques](../CHOIX_TECHNIQUES.md) expliquent les couches. Les [guides métier](../openapi/architecture-api.md) et les [sources OpenAPI](../openapi/openapi.yaml) définissent les échanges à respecter.

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

Le backend utilise le port hôte `BACKEND_PORT`, par défaut `3000`. Sans route métier déclarée, `GET /` répond `404`.

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

```text
HTTP → Controller → Service → Repository → PostgreSQL
```

- `controllers/` : déclarer les routes et déléguer au Service.
- `services/` : appliquer les règles métier et coordonner les accès.
- `dto/` : décrire et valider les données échangées.
- `entities/` : représenter les tables et relations validées.
- `repositories/` : réserver les classes personnalisées aux requêtes spécifiques.

Les modules exportent leur Service. Ajouter un Controller, un provider ou une dépendance entre ressources peut nécessiter une modification du module ; vérifier alors les imports et les risques de dépendance circulaire.

### Validation des entrées

Le [ValidationPipe global](src/validation.pipe.ts) est déjà raccordé dans [main.ts](src/main.ts). Les futurs DTO d’entrée utiliseront les décorateurs `class-validator` ; une classe TypeScript seule ne suffit pas.

La configuration rejette les propriétés inconnues (`whitelist` et `forbidNonWhitelisted`), active `transform` et désactive les conversions implicites. Le format d’erreur `application/problem+json` reste un chantier séparé.

## Enregistrement des entités

Le [registre généré](src/persistence/feature-entities.generated.ts) alimente `TypeOrmModule.forFeature(...)` dans chaque ressource. Ses six listes sont vides : les classes préparatoires ne sont pas décorées et aucun repository métier n’est injecté.

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

[DatabaseModule](src/persistence/database.module.ts) et le pilote `pg` configurent la connexion. Le registre vide ne signifie pas que la base est vide : les tables sont créées par les migrations, indépendamment des Entities.

Le SQL de Patients, Seuils et Consentements est présent ; les autres migrations restent à compléter. Consentements nécessite les tables Patient et Soignant. Vérifier les dépendances et l’historique local avant toute application.

La configuration partagée conserve `synchronize: false` et `migrationsRun: false`. Le [guide des migrations](../docs/docker.md#migrations-typeorm) explique création, génération, statut et application.

## Build et tests

```bash
npm --prefix backend run build
npm --prefix backend test
npm --prefix backend run test:infrastructure
```

Ces commandes doivent terminer sans erreur. Examiner les suites et le nombre de tests : `test:integration` utilise `--passWithNoTests` et peut réussir sans test métier.

Les tests unitaires et HTTP du squelette remplacent le module de connexion pour rester indépendants de PostgreSQL. Ils ne prouvent pas la persistance. Les tests d’écriture sur le backend nécessiteront une base isolée ; voir [Schemathesis](../docs/tests/schemathesis.md#passer-au-backend-nestjs).

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
