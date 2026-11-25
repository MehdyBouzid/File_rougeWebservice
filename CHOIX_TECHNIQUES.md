# Choix techniques — Veillo

Ce document présente les technologies retenues et indique où placer le code.

- **Échanges et règles métier :** [guides métier](openapi/architecture-api.md).
- **Lancement et développement :** [README du backend](backend/README.md).

## 1. Technologies retenues

### NestJS et TypeScript

**NestJS structure l’API** en modules, Controllers et Services. Cette organisation permet de répartir le développement par ressource.

L’**injection de dépendances** fournit à une classe les composants dont elle a besoin. Par exemple, NestJS fournit le Service au Controller.

**TypeScript vérifie les types à la compilation.** Il aide à détecter les erreurs entre composants, mais ne valide pas les requêtes HTTP reçues.

### TypeORM

**Quoi ?** Un ORM qui associe les classes TypeScript aux tables PostgreSQL.

**Pourquoi ?** Simplifier l’accès aux données grâce à son intégration avec NestJS.

**Comment ?** Les **Entities** décrivent les données persistées. Les **Repositories** fournissent les opérations de lecture et d’écriture.

**Dans Veillo :** les Services utiliseront les repositories TypeORM. Un repository personnalisé n’est pas nécessaire par défaut.

**État actuel :** TypeORM, le pilote `pg` et la connexion par variables d’environnement sont configurés. Aucune Entity métier n’est encore active.

### Python — à confirmer

Python est envisagé pour générer des mesures fictives et les envoyer en HTTP, sans montre réelle.

**À confirmer :** aucun programme Python ni configuration du simulateur n’est présent dans le dépôt.

### OpenAPI

[openapi.yaml](openapi/openapi.yaml) est le point d’entrée du **contrat HTTP** commun au backend, au simulateur et au client mobile externe.

Il décrit les routes, paramètres, JSON et réponses attendus. Un **mock** simule ces échanges pour préparer les clients avant que le backend soit prêt.

Le [guide TP3](docs/outillage-tp3.md) explique les fichiers et les outils. Les formats encore ouverts ne sont pas des décisions définitives.

## 2. Organisation du backend

[features/](backend/src/features/) regroupe six ressources : `patients`, `measurements`, `thresholds`, `alerts`, `consents` et `caregivers`.

Chaque ressource rassemble ses couches. Les fichiers qui évoluent ensemble restent proches, et chaque développeur retrouve son périmètre.

**Parcours prévu d’une requête :**

```text
Requête HTTP → validation du DTO → Controller → Service → Repository → PostgreSQL
```

**Exemple de nommage :** le dossier interne `thresholds` correspond aux URI `/patients/{patientId}/seuils`. Le nom du dossier n’impose pas celui de la route.

## 3. Responsabilités des couches

### Module

**Assembler les composants.** Il déclare les Controllers, Services et imports, puis exporte les dépendances utiles aux autres modules.

Dans Veillo, `AppModule` rassemble les six ressources et `DatabaseModule`. Un Module ne contient ni traitement HTTP ni règle métier.

### Controller

**Gérer les échanges HTTP.** Il déclare les routes, lit les entrées et construit les réponses prévues par OpenAPI.

Il appelle le Service. Il ne porte ni règle métier ni accès direct à la base.

### Service

**Appliquer les règles métier.** Il coordonne les accès aux données et les transactions : plusieurs écritures peuvent ainsi réussir ou échouer ensemble.

Les autorisations et le consentement ne sont pas décidés par le Repository. Les en-têtes et autres détails HTTP restent dans le Controller.

### DTO

**Décrire les données échangées.** Un DTO d’entrée porte les décorateurs de validation `class-validator`.

Le **ValidationPipe global** est configuré pour appliquer ces contrôles à l’exécution. Les DTO préparatoires restent à compléter selon les schémas validés.

Un DTO ne définit pas la table et ne contient pas de traitement métier.

### Entity

**Décrire les données persistées.** Les décorateurs TypeORM associent la classe aux colonnes et relations PostgreSQL.

L’Entity doit respecter le modèle validé et les migrations. Elle ne définit ni les routes ni les données autorisées dans une réponse.

**À retenir :** DTO et Entity ont des rôles différents. Leurs propriétés n’ont pas à être identiques.

### Repository

**Lire et écrire les données pour le Service.** Utiliser d’abord le repository standard TypeORM.

Une classe personnalisée n’est utile que pour des requêtes spécifiques. Les règles métier restent dans le Service.

## 4. PostgreSQL et migrations

### Relations entre les données

Une **clé étrangère** garantit qu’une référence cible une ligne existante. Dans le MPD, Consentement référence Patient et Soignant.

Une **table de jointure** représente une relation plusieurs-à-plusieurs. `SUIVRE` relie ainsi les patients à leurs soignants, sans être automatiquement exposée par l’API.

### Faire évoluer le schéma

Une **migration** est un fichier versionné qui modifie le schéma PostgreSQL. Cela permet de relire le SQL et de partager les mêmes évolutions entre développeurs.

Les fichiers sont dans [persistence/migrations/](backend/src/persistence/migrations/) :

- `up()` applique le changement.
- `down()` prévoit son retour arrière.
- `veillo_migrations` conserve l’historique et évite de rejouer les migrations enregistrées.

**Choix retenus :** `synchronize: false` interdit l’alignement automatique sur les Entities ; `migrationsRun: false` désactive les migrations au démarrage.

**Avant application :** relire le SQL et les dépendances. Une migration partagée ou appliquée se corrige par un nouveau fichier.

**Vigilance :** un retour arrière peut supprimer des données. Il ne résout pas automatiquement un conflit entre développeurs.

## 5. Fonctionnement du simulateur IoT

Le simulateur devra produire fréquence cardiaque, SpO₂ et pas, puis envoyer un lot toutes les minutes.

```text
Simulateur → HTTP/JSON → POST /measurements → backend → PostgreSQL
```

C’est un **client HTTP** : il n’accède pas directement à la base. Python reste le langage envisagé.

Le backend devra authentifier l’émetteur, vérifier ses droits sur `patientId` et traiter le lot. Le JSON et les points ouverts figurent dans le [guide Mesures](openapi/measurements/guide.md).

## 6. État actuel de l’architecture

### Socle préparé

- Serveur NestJS, six modules et injection des Services.
- Validation globale des entrées.
- Connexion PostgreSQL configurée et outillage de migrations.
- Six migrations : SQL préparé pour Patients, Seuils et Consentements ; trois autres squelettes.

L’état appliqué dépend de chaque base : consulter les [commandes Docker](docs/docker.md#migrations-typeorm).

### Fonctionnalités à développer

- Entities actives et persistance applicative.
- Routes, règles métier et contrôles d’accès.
- OAuth 2.0/JWT, simulateur et notifications.

Les DTO et Entities préparatoires d’Ethan restent des squelettes. Les autres emplacements peuvent encore ne contenir qu’un `.gitkeep`.

**Le SQL prêt ne prouve pas que les parcours HTTP fonctionnent.** Les tests du contrat sur un mock ne remplacent pas les tests du backend et de sa persistance.

Les décisions de conception et leurs limites restent dans [design.md](docs/design.md), les traitements dans [api.md](docs/api.md) et les réponses dans [api-review.md](docs/api-review.md).
