# Docker — Commandes de développement Veillo

Commandes à lancer depuis la racine, avec Docker Desktop démarré. Chaque développeur conserve son `.env` et sa base locale. Configuration : [compose.yaml](../compose.yaml), [outillage migrations](../compose.migrations.yaml) et [.env.example](../.env.example).

## 1. Démarrer ou reconstruire

Créer le `.env` uniquement s’il n’existe pas, puis y renseigner `DB_PASSWORD` avant le premier lancement.

```bash
[ -f .env ] || cp .env.example .env
```

Construire et démarrer `backend` et `postgres`, au premier lancement ou après un changement de code, de dépendances ou du Dockerfile.

```bash
docker compose up -d --build
```

Par défaut, le backend est accessible sur `http://localhost:3000` et PostgreSQL sur `127.0.0.1:55432` ; modifier `BACKEND_PORT` ou `DB_PORT` dans `.env` si un port est occupé.

## 2. Arrêter et reprendre

Arrêter les conteneurs en conservant leurs données.

```bash
docker compose stop
```

Redémarrer les conteneurs arrêtés sans reconstruire leurs images.

```bash
docker compose start
```

**Protection des données :** conserver le volume `veillo_postgres_data` et le `.env` existant ; changer son mot de passe ne met pas à jour celui du cluster déjà initialisé, et un volume ne remplace pas une sauvegarde.

## 3. État et logs

Afficher l’état et les ports des conteneurs, y compris ceux arrêtés, et vérifier que PostgreSQL est `healthy`.

```bash
docker compose ps -a
```

Suivre les 30 dernières lignes de logs ; `Ctrl+C` quitte sans arrêter les services.

```bash
docker compose logs --tail=30 -f backend postgres
```

## 4. Terminal du backend

Ouvrir un shell dans le backend, avec `exit` pour quitter.

```bash
docker compose exec backend sh
```

## 5. Commandes PostgreSQL utiles

### Se connecter

Depuis la racine du projet, avec le service `postgres` démarré, ouvrir `psql` avec la base et l’utilisateur configurés dans le conteneur.

```bash
docker compose exec postgres sh -c 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Les commandes ci-dessous se saisissent dans `psql`, pas dans le terminal système. Les commandes commençant par `\` ne nécessitent pas de point-virgule ; les requêtes SQL se terminent par `;`.

### Consulter les tables et leur structure

**Les tables métier doivent d’abord être créées par leurs migrations.** Le démarrage de PostgreSQL ne crée pas `patient`, `seuil` ou `consentement` ; une table absente n’est donc pas forcément une erreur de connexion.

- `\dt` : lister les tables visibles.
- `\dt+` : afficher aussi leur taille et leur description.
- `\d` : lister les relations visibles, notamment les tables, vues et séquences.
- `\d patient` : afficher la structure de Patient (colonnes, types, clés et contraintes).
- `\d seuil` : afficher la structure de Seuil.
- `\d consentement` : afficher la structure de Consentement.

### Aide et sortie

- `\?` : afficher l’aide des commandes `psql` ; `?` seul ne suffit pas.
- `\q` : quitter `psql` sans arrêter PostgreSQL.

### Voir les index, schémas et bases

- `\di` : lister les index visibles.
- `\di public.*` : lister les index du schéma `public`, dont ceux des tables métier déjà créées.
- `\dn` : lister les schémas.
- `\l` : lister les bases de données.
- `\conninfo` : vérifier la base, l’utilisateur et la connexion en cours.

Les tables métier sont dans le schéma `public` ; pour préciser le schéma, utiliser par exemple `\d public.patient`.

Lister les tables du schéma `public` sans ouvrir de session interactive.

```bash
docker compose exec postgres sh -c 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt public.*"'
```

### Consulter l’historique des migrations

Dans `psql`, afficher les migrations enregistrées par TypeORM, dans leur ordre d’application :

```sql
SELECT id, timestamp, name
FROM public.veillo_migrations
ORDER BY id;
```

Cet historique contient les migrations appliquées, pas celles encore en attente. Ne pas le modifier manuellement ; si la table n’existe pas encore, TypeORM la créera lors de la gestion des migrations.

## Migrations TypeORM

Les fichiers sont dans [backend/src/persistence/migrations/](../backend/src/persistence/migrations/). **Certains squelettes lèvent encore une erreur : les compléter et les relire avant d’appliquer toutes les migrations en attente.**

**Exécuter uniquement la migration Patient (exemple)** depuis la racine, avec PostgreSQL démarré,

```bash
docker compose -f compose.yaml -f compose.migrations.yaml run --rm --build migration-tools node -e 'const d=require("./dist/persistence/data-source.js").default;d.setOptions({migrations:["dist/persistence/migrations/1794929035067-CreatePatients.js"]});d.initialize().then(async()=>{try{await d.runMigrations()}finally{await d.destroy()}}).catch(e=>{console.error(e);process.exitCode=1})'
```

Cette commande conserve la connexion et l’historique `veillo_migrations` configurés : elle applique Patient dans une transaction si cette migration n’est pas déjà enregistrée, sans exécuter les autres migrations ni modifier les fichiers du projet. Elle a été vérifiée par lecture du code, mais n’a pas été exécutée.

Créer un squelette horodaté en remplaçant `DescriptionEvolution` par un nom explicite en PascalCase.

```bash
docker compose -f compose.yaml -f compose.migrations.yaml run --rm --build migration-tools npm run migration:create -- DescriptionEvolution
```

Générer une migration en comparant les Entities compilées à une base de référence à jour, sans appliquer le SQL produit.

```bash
docker compose -f compose.yaml -f compose.migrations.yaml run --rm --build migration-tools npm run migration:generate -- DescriptionEvolution
```

L’outillage écrit les fichiers dans les sources locales ; la génération retourne le code `1` sans fichier lorsqu’aucune différence n’est détectée.

Vérifier les conventions de nommage et l’absence de doublons locaux de nom ou de timestamp.

```bash
docker compose -f compose.yaml -f compose.migrations.yaml run --rm --build migration-tools npm run migration:check
```

Consulter les migrations appliquées (`[X]`) et en attente (`[ ]`) présentes dans l’image du backend.

```bash
docker compose exec backend npm run migration:show
```

Appliquer les migrations en attente uniquement après relecture du SQL, validation commune et sauvegarde adaptée.

```bash
docker compose exec backend npm run migration:run
```

**Avant application :** reconstruire avec la commande de la section 1 pour inclure les migrations compilées ; un statut vide dans une ancienne image ne signifie pas que les sources sont vides.

**Travail à deux :**

- Récupérer les dernières migrations avant d’en créer une.
- Vérifier noms, timestamps, ordre, dépendances et SQL avant fusion : un timestamp unique n’empêche pas un conflit de schéma.
- Corriger une migration partagée ou appliquée par une nouvelle migration.
- N’appliquer qu’une série à la fois sur une base commune.

`synchronize: false` et `migrationsRun: false` restent configurés : démarrer le backend n’applique aucune migration, et aucun conflit ne doit être résolu en supprimant ou réinitialisant une base.

<a id="10-état-actuel-et-limites"></a>

Ce guide a été simplifié après vérification des fichiers Docker, Compose et des scripts npm ; aucune commande Docker ni migration n’a été exécutée pendant cette modification.
