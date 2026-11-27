# Choix techniques — Veillo

Ce document explique les technologies retenues et leurs limites. Pour savoir où placer le code, consulter l’[architecture backend](backend/architecture-backend.md).

## NestJS et TypeScript

**NestJS structure le backend** en modules par ressource. Cette organisation facilite la répartition du développement et fournit l’injection de dépendances : NestJS transmet aux classes les composants dont elles ont besoin.

**TypeScript vérifie les types à la compilation.** Il aide à détecter les erreurs entre composants, mais ne valide pas les données HTTP reçues. Le [contrôle des entrées](backend/README.md#validation-des-entrées) complète cette vérification à l’exécution.

Les responsabilités des Controllers, Services, DTO, Entities et Repositories sont centralisées dans l’[architecture backend](backend/architecture-backend.md#modules-et-couches).

## PostgreSQL et TypeORM

**PostgreSQL conserve les données et leurs relations.** Les clés étrangères et contraintes du modèle assurent l’intégrité des références ; voir la [modélisation des données](docs/design.md#4-modélisation-des-données).

**TypeORM associe les classes TypeScript aux tables.** Son intégration NestJS fournit les repositories pour lire et écrire les données. Le pilote `pg` assure la connexion PostgreSQL.

Le repository standard suffit par défaut ; une classe personnalisée n’est pas imposée. Les Services peuvent aussi utiliser du SQL paramétré pour les requêtes spécifiques, selon l’[organisation actuelle](backend/architecture-backend.md#modules-et-couches).

### Évolution explicite du schéma

Les migrations versionnent les évolutions SQL pour permettre leur relecture et leur partage. `synchronize: false` et `migrationsRun: false` évitent les changements de schéma automatiques au démarrage.

Ce choix demande une application explicite des migrations et une coordination entre développeurs. Les [procédures et précautions](docs/docker.md#migrations-typeorm) expliquent l’historique, les dépendances et les risques du retour arrière.

L’enregistrement d’une Entity reste indépendant de la création de sa table : voir le [registre TypeORM](backend/README.md#enregistrement-des-entités).

## OpenAPI

**OpenAPI définit le contrat HTTP commun** au backend, au simulateur et au client mobile externe. Il permet de préparer les clients avec un mock avant que les fonctionnalités du backend soient disponibles.

Les YAML restent la référence des échanges. Les [guides métier](openapi/architecture-api.md#se-repérer) les expliquent ; les formats encore ouverts ne sont pas des décisions définitives.

La [validation des réponses](backend/README.md#validation-openapi-des-réponses) utilise ce contrat à l’exécution. Elle complète les tests, sans garantir les autorisations ni les règles métier.

Pour modifier les sources, consulter l’[architecture OpenAPI](openapi/architecture-api.md). Le [guide TP3](docs/outillage-tp3.md) présente les outils et leur utilisation.

## Python — à confirmer

Python est envisagé pour le simulateur IoT. Aucun programme Python ni configuration du simulateur n’est présent dans le dépôt ; ce choix reste à confirmer.

Le simulateur sera un client HTTP, sans accès direct à PostgreSQL. Son rôle est décrit dans la [conception](docs/design.md#2-responsabilités-des-composants) et son JSON dans le [contrat Mesures](openapi/measurements/measurements-contract.md).

## Références

- [Conception métier et modèles](docs/design.md) : besoins, relations, règles et décisions ouvertes.
- [Architecture backend](backend/architecture-backend.md) : dossiers, responsabilités et flux HTTP.
- [README backend](backend/README.md) : environnement, état du code, lancement et tests.

**Un SQL présent ne prouve pas son application sur chaque base. Un mock réussi ne prouve pas le fonctionnement de la persistance.** Les vérifications et preuves restent dans les guides d’utilisation.
