# Docker — Commandes de développement Veillo

Toutes les commandes se lancent depuis la racine du dépôt, avec Docker Desktop démarré ; chacun utilise son propre `.env` et sa propre base locale.

## 1. Démarrer ou reconstruire

Créer le `.env` uniquement s’il n’existe pas, puis y renseigner `DB_PASSWORD` avant le premier lancement.

```bash
[ -f .env ] || cp .env.example .env
```

Construire les images et démarrer `backend` et `postgres`, au premier lancement ou après une modification du code, des dépendances ou du Dockerfile.

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

Afficher les derniers journaux puis les suivre en continu, avec `Ctrl+C` pour quitter sans arrêter les services.

```bash
docker compose logs --tail=30 -f backend postgres
```

## 4. Terminal du backend

Ouvrir un shell dans le backend, avec `exit` pour quitter.

```bash
docker compose exec backend sh
```

## 5. PostgreSQL et tables

Ouvrir `psql` avec la base et l’utilisateur configurés dans le conteneur, avec `\q` pour quitter.

```bash
docker compose exec postgres sh -c 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Lister les tables du schéma `public` sans ouvrir de session interactive.

```bash
docker compose exec postgres sh -c 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt public.*"'
```

## Migrations TypeORM

Les fichiers sont dans `backend/src/persistence/migrations/` ; **les six squelettes actuels doivent être complétés avant toute application**, car leurs méthodes lèvent volontairement une erreur.

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

**À deux :** récupérer les dernières migrations, vérifier leur ordre et leurs dépendances avant fusion, ne jamais modifier une migration appliquée ou partagée et ne lancer qu’une application à la fois sur une base commune ; les timestamps ne garantissent pas l’absence de conflit SQL.

`synchronize: false` et `migrationsRun: false` restent configurés : démarrer le backend n’applique aucune migration, et aucun conflit ne doit être résolu en supprimant ou réinitialisant une base.

<a id="10-état-actuel-et-limites"></a>

Ce guide a été simplifié après vérification des fichiers Docker, Compose et des scripts npm ; aucune commande Docker ni migration n’a été exécutée pendant cette modification.
