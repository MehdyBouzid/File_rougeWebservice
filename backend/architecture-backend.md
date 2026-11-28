# Architecture technique du backend — Veillo

Ce guide indique où placer son code et comment les composants collaborent. Pour lancer le projet ou suivre son avancement, consulter le [README backend](README.md).

## Vue d’ensemble

NestJS organise l’API par ressource métier. TypeScript décrit les types et TypeORM permet l’accès à PostgreSQL.

```text
Client HTTP → Controller → Service → accès aux données → PostgreSQL
```

Chaque ressource rassemble ses couches pour faciliter le travail en parallèle. Les [contrats OpenAPI](../openapi/architecture-api.md) définissent les échanges ; les [choix techniques](../CHOIX_TECHNIQUES.md) expliquent les technologies retenues.

## Organisation des fichiers

Arborescence principale, abrégée :

```text
backend/
├── src/
│   ├── main.ts                # Démarrage et configuration HTTP globale
│   ├── app.module.ts          # Assemblage des modules
│   ├── validation.pipe.ts     # Validation des DTO d’entrée
│   ├── features/              # Patients, mesures, seuils, alertes, consentements, soignants
│   ├── common/                # Composants techniques partagés
│   └── persistence/           # Connexion, registre d’Entities et migrations SQL
├── scripts/                   # Outillage des Entities et des migrations
├── test/
│   ├── unit/                  # Tests isolés, organisés comme src/
│   ├── integration/           # Assemblage, scripts et contrôles PostgreSQL
│   └── e2e/                   # Tests HTTP
├── Dockerfile                 # Construction de l’image backend
└── package.json               # Dépendances et commandes npm
```

Les tests sont centralisés dans `test/`. Les dossiers unitaires reproduisent ceux de `src/` ; les fichiers d’intégration Jest utilisent `*.int-spec.ts` et les tests HTTP `*.e2e-spec.ts`. `dist/` contient le résultat du build : ne pas le modifier à la main.

## Modules et couches

[AppModule](src/app.module.ts) assemble `DatabaseModule` et les six ressources : `patients`, `measurements`, `thresholds`, `alerts`, `consents` et `caregivers`.

Un module relie ses composants et exporte son Service. Il ne contient ni traitement HTTP ni règle métier.

Pour utiliser le Service d’une autre ressource, importer son module et laisser NestJS l’injecter dans le constructeur. Ne pas recréer ce Service avec `new` ni le redéclarer comme provider local.

Dépendances métier actuellement déclarées :

```text
MeasurementsModule → AlertsModule → CaregiversModule
MeasurementsModule ──────────────→ CaregiversModule
```

Éviter les dépendances circulaires. Les rôles métier des ressources sont décrits dans leurs [guides de contrat](../openapi/architecture-api.md#se-repérer).

Chaque ressource possède les emplacements suivants :

| Emplacement | Responsabilité | Quand y intervenir ? |
| --- | --- | --- |
| `*.module.ts` | Déclarer Controllers, providers, imports et exports. | Ajouter un composant injectable ou une dépendance entre ressources. |
| `controllers/` | Lire les entrées HTTP, appeler le Service et produire les réponses. | Raccorder une route, un statut ou un header OpenAPI ; sans SQL ni règle métier. |
| `services/` | Appliquer le métier, coordonner les accès et les transactions. | Ajouter un traitement ou regrouper des écritures qui doivent réussir ensemble. |
| `dto/` | Décrire les données reçues et renvoyées. | Définir un échange ; utiliser `class-validator` pour valider les classes d’entrée. |
| `entities/` | Relier les classes TypeORM aux tables PostgreSQL. | Représenter les données persistées selon le modèle et les migrations validés. |
| `repositories/` | Accueillir un accès aux données personnalisé si nécessaire. | Isoler des requêtes spécifiques ; le repository standard TypeORM suffit par défaut. |

Les Services actuels utilisent aussi `DataSource` pour du SQL paramétré et réalisent le mapping des réponses. Aucun Repository personnalisé ni mapper séparé n’est imposé.

**DTO et Entity ont des rôles différents.** Une table ne définit pas automatiquement le JSON exposé. Un DTO ne contient pas de traitement métier ; une Entity ne définit ni route ni droit d’accès.

Une interface TypeScript ne valide pas les données à l’exécution.

Les règles d’autorisation et de consentement ne sont pas décidées par le Repository. Les détails HTTP restent dans le Controller. Les DTO doivent suivre les schémas validés ; les [écarts actuels](README.md#validation-openapi-des-réponses) restent à arbitrer.

Le nom du dossier ne fixe pas la route : `thresholds/` correspond aux URI `/patients/{patientId}/seuils` définies dans OpenAPI.

## Composants communs et persistance

| Emplacement | Rôle dans Veillo | À consulter pour… |
| --- | --- | --- |
| `common/http/` | Filtre d’erreurs RFC 9457 et liens de pagination. | [Gérer les erreurs](README.md#erreurs-http) ou [paginer une réponse](README.md#pagination). |
| `common/validation/` et `common/types/` | Contrôles partagés et enum des types de mesure. | Réutiliser les mêmes contrôles et types entre ressources. |
| `common/cache/` | Espace de développement du cache HTTP des seuils. | [Préparer les utilitaires et leurs tests](src/common/cache/cache-implementation.md). |
| `persistence/` | Configuration PostgreSQL commune à NestJS et au DataSource des migrations. | [Configurer la persistance](README.md#postgresql-et-migrations). |

Les migrations font évoluer le schéma ; le registre généré rend les Entities disponibles à TypeORM. **Enregistrer une Entity ne crée pas sa table.**

- Ne pas éditer `feature-entities.generated.ts` : suivre la [procédure d’enregistrement](README.md#enregistrement-des-entités).
- Conserver `synchronize: false` et `migrationsRun: false` : les changements de schéma restent explicites.
- Vérifier l’historique et les dépendances avant application : voir les [migrations TypeORM](../docs/docker.md#migrations-typeorm).

## Cheminement d’une requête

[main.ts](src/main.ts) branche les contrôles communs pour les routes développées :

```text
Entrée HTTP → ValidationPipe → Controller → Service → accès aux données
Retour du Service → Controller → contrôle JSON OpenAPI → client
Exception → ProblemDetailsFilter → réponse application/problem+json
```

- **Entrées :** les décorateurs des DTO sont contrôlés par le [ValidationPipe global](README.md#validation-des-entrées), sans conversion implicite.
- **Sorties :** [express-openapi-validator](README.md#validation-openapi-des-réponses) utilise le bundle ; il ne valide ni les requêtes ni la sécurité. Ses limites concernent notamment les headers, les `204/304`, les `5xx` et les schémas ouverts.
- **Erreurs :** le [filtre global](README.md#erreurs-http) construit les réponses RFC 9457 et masque les détails internes au client.

Ce flux ne garantit pas l’ordre des erreurs exigé par chaque opération. **La validation ne remplace pas l’authentification, les autorisations ou le consentement.** Leur raccordement est précisé dans le [README backend](README.md).

## Ajouter une fonctionnalité

1. Lire le contrat de la ressource et les [décisions ouvertes](../docs/design.md#8-décisions-restant-à-clarifier). Ne pas transformer un choix présent dans le code en décision validée.
2. Placer les DTO et les Entities nécessaires dans la ressource. Si le schéma évolue, préparer une migration et actualiser le registre.
3. Écrire le traitement dans le Service, avec les accès aux données et les transactions nécessaires.
4. Raccorder le Controller, les contrôles d’accès et les réponses HTTP prévus. Vérifier les dépendances du module.
5. Ajouter les tests adaptés et suivre les [commandes de vérification](README.md#build-et-tests). Pour les tests de contrat, consulter [Schemathesis](../openapi/schemathesis/schemathesis.md#passer-au-backend-nestjs).

**Les tests avec écritures réelles exigent une base isolée.** Un mock ou des doubles de persistance ne prouvent pas le fonctionnement avec PostgreSQL.
