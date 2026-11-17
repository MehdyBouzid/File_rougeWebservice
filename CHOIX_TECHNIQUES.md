# Choix techniques — Veillo

## 1. Technologies retenues

### NestJS et TypeScript

NestJS structure le backend autour de modules, de contrôleurs et de services, avec une injection de dépendances intégrée. Cette organisation facilite le partage du travail entre développeurs ; TypeScript rend les interfaces entre composants explicites et permet de détecter des erreurs de types à la compilation.

### TypeORM

TypeORM relie les classes représentant les données aux opérations de stockage et fournit des repositories standards. Son intégration avec NestJS permet d’injecter ces repositories dans les services et de préparer la persistance sans écrire systématiquement une couche d’accès personnalisée. Les dépendances sont installées, mais aucune connexion ni entité métier n’est configurée.

### Migrations TypeORM

Une migration est un fichier TypeScript versionné qui décrit un changement du schéma PostgreSQL (créer une table, ajouter une colonne). Elle se trouve dans `backend/src/persistence/migrations/`.

Nous utilisons des migrations plutôt qu'une modification automatique, car `synchronize: false` empêche TypeORM d'aligner seul la base sur les Entities : une synchronisation pourrait supprimer des colonnes ou des données sans avertissement. Une Entity décrit le modèle voulu ; seule une migration crée réellement la table.

Chaque migration contient `up()`, qui applique le changement, et `down()`, qui l'annule. TypeORM note les migrations exécutées dans la table `veillo_migrations`, et n'applique que celles qui manquent. Elles ne se lancent pas au démarrage (`migrationsRun: false`) : on les applique volontairement avec `npm run migration:run`.

À ce stade, le dossier ne contient aucune migration : aucune n'a été appliquée et aucune table métier n'existe. Les commandes sont détaillées dans [docs/docker.md](docs/docker.md).

En équipe, on relit une migration avant de l'exécuter, car elle modifie la base commune et son `down()` peut supprimer des données. On ne modifie jamais une migration déjà partagée : les bases qui l'ont appliquée ne la rejouent pas, leur schéma divergerait. On ajoute une nouvelle migration corrective.

### Python — à confirmer

Python est envisagé pour le simulateur IoT : un programme autonome pourra générer des mesures fictives et les envoyer en HTTP. Cela permettrait de tester les échanges avec le backend indépendamment de son langage et sans matériel connecté. Aucun fichier Python ni configuration du simulateur n’est présent dans le dépôt ; ce choix reste donc à confirmer.

### OpenAPI

Le fichier [openapi/openapi.yaml](openapi/openapi.yaml) décrit le contrat HTTP commun au backend, au simulateur et à l’application mobile externe. Il sert de référence pour les opérations, paramètres, données et réponses, et permet de valider ou de simuler les échanges avant l’implémentation du backend. Les éléments encore ouverts dans le contrat ne constituent pas des décisions définitives.

## 2. Organisation du backend

Le dossier `backend/src/features/` regroupe six ressources : `patients`, `measurements`, `thresholds`, `alerts`, `consents` et `caregivers`. Cette organisation rapproche les fichiers qui évoluent ensemble et permet à chaque développeur de travailler sur un périmètre métier identifiable.

Chaque ressource possède ses dossiers `controllers`, `services`, `dto`, `entities` et `repositories`. Les couches séparent le transport HTTP, les règles métier et le stockage, pour faire évoluer l’un sans disperser ses responsabilités dans les autres. Les noms internes ne définissent pas les URI : par exemple, `thresholds` correspond aux routes `/patients/{patientId}/seuils` du contrat.

### Organisation des ressources métier

- `patients/` : Patients
- `measurements/` : Mesures
- `thresholds/` : Seuils
- `alerts/` : Alertes
- `consents/` : Consentements
- `caregivers/` : Soignants

Ces rôles décrivent le périmètre prévu par le contrat OpenAPI. Pour l’instant, seuls les modules et leurs squelettes existent : aucune de ces fonctionnalités n’est encore implémentée (voir la section 5).

## 3. Responsabilités des couches

### Module

Le Module assemble les contrôleurs, services et imports d’une ressource et rend disponibles les dépendances nécessaires. Il définit aussi les exports utiles aux autres modules ; il ne contient ni traitement HTTP ni règles métier. `AppModule` rassemble les six modules du backend.

### Controller

Le Controller reçoit les requêtes HTTP, récupère les données d’entrée et retourne les réponses prévues par le contrat. Il déclare les routes et délègue le traitement au Service, sans porter les règles métier ni accéder directement à la base.

### Service

Le Service applique les règles métier et coordonne les opérations nécessaires, notamment l’accès aux données et les transactions lorsqu’elles seront définies. Il utilise la persistance sans dépendre de la façon dont une requête HTTP est reçue. Les statuts et les détails propres au transport restent dans la couche HTTP.

### DTO

Le DTO décrit les données échangées, notamment les entrées attendues par une opération. Les DTO d’entrée porteront les contraintes de validation retenues, avec un mécanisme de validation à configurer ; le typage TypeScript seul ne valide pas une requête à l’exécution. Un DTO ne définit pas automatiquement la structure de stockage et ne contient pas les traitements métier.

### Entity

L’Entity représente les données persistées et leur correspondance avec la base au moyen des décorateurs TypeORM. Elle contiendra les champs et relations validés à partir du modèle de données. Elle ne définit ni les routes HTTP ni, à elle seule, les données autorisées dans une requête ou une réponse.

### Repository

Le Repository effectue les lectures et écritures des entités pour le Service. TypeORM fournit déjà des repositories standards : un repository personnalisé n’est nécessaire que pour un besoin d’accès aux données spécifique. Il ne doit pas décider des autorisations, des consentements ou des autres règles métier.

## 4. Fonctionnement du simulateur IoT

Si Python est confirmé, le simulateur produira des relevés fictifs de fréquence cardiaque, de SpO₂ et de nombre de pas. Il les transmettra par lots toutes les minutes, en HTTP/JSON, à l’opération `POST /measurements` définie dans le contrat.

Le simulateur est un client HTTP : il n’accède pas directement à PostgreSQL et ne décide pas des règles du suivi. Le backend recevra les lots, vérifiera les autorisations et les données, puis appliquera les traitements métier et la persistance. L’identification de la montre et son rattachement au patient restent à préciser.

## 5. État actuel de l’architecture

Le serveur NestJS et les six modules sont préparés. Chaque Controller reçoit son Service par injection, mais aucune méthode HTTP ni logique métier n’est implémentée ; les dossiers DTO, Entity et Repository contiennent seulement des fichiers `.gitkeep`.

TypeORM est installé et chaque module utilise `TypeOrmModule.forFeature(...)` avec une liste d’entités vide. Un script central génère le registre des entités avant le build ou le démarrage, selon les conventions décrites dans le [README du backend](backend/README.md). L’enregistrement d’une vraie entité nécessitera aussi la configuration d’une connexion et du pilote adapté ; PostgreSQL reste la base prévue.

Le simulateur, les fonctionnalités de suivi, les accès PostgreSQL, la sécurité OAuth 2.0/JWT et les notifications restent à développer. Les règles déjà retenues et les questions ouvertes sont détaillées dans [docs/design.md](docs/design.md), tandis que les opérations et leurs réponses figurent dans [docs/api.md](docs/api.md) et [docs/api-review.md](docs/api-review.md).
