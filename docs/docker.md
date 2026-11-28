# Docker — Commandes de développement Veillo

Ce guide rassemble les commandes quotidiennes pour NestJS, PostgreSQL et les migrations. **Toutes partent de la racine du dépôt**, avec Docker Desktop démarré.

Chaque développeur conserve son `.env` et sa base locale. Sources : [compose.yaml](../compose.yaml), [outillage migrations](../compose.migrations.yaml) et [.env.example](../.env.example).

## 1. Démarrer ou reconstruire

Créer `.env` seulement s’il manque, puis renseigner `DB_PASSWORD` avant le premier lancement :

```bash
[ -f .env ] || cp .env.example .env
```

Construire et démarrer `backend` et `postgres`, au premier lancement ou après modification du code, des dépendances ou du Dockerfile :

```bash
docker compose up -d --build
```

Le backend est publié par défaut sur `http://localhost:3000` et PostgreSQL sur `127.0.0.1:55432`. Modifier `BACKEND_PORT` ou `DB_PORT` dans `.env` si nécessaire, sans arrêter les autres applications.

Compose fournit `postgres:5432` au backend : c’est l’adresse interne de la base, distincte du port publié sur l’hôte. Le backend attend le healthcheck PostgreSQL, qui vérifie que le serveur accepte les connexions.

Le [bundle OpenAPI](../openapi/openapi.bundle.yaml) est monté en lecture seule pour valider les réponses. Il doit être présent et régénéré après une modification des sources ; voir le [guide du bundle](../openapi/bundle.md#générer-et-mettre-à-jour). Ce fichier n’est pas inclus dans l’image backend seule.

## 2. Arrêter et reprendre

Arrêter les services sans supprimer les données :

```bash
docker compose stop
```

Reprendre les conteneurs arrêtés sans reconstruire leurs images :

```bash
docker compose start
```

Les données PostgreSQL sont dans le volume nommé `veillo_postgres_data`, conservé entre les redémarrages. Un volume ne remplace pas une sauvegarde.

Conserver le `.env` existant : modifier son mot de passe ne change pas celui d’un cluster déjà initialisé. Ne pas supprimer le volume pour résoudre un problème de connexion.

## 3. État et logs

Afficher les conteneurs, leurs ports et leur état, y compris ceux arrêtés ; PostgreSQL doit être `healthy` :

```bash
docker compose ps -a
```

Suivre les 30 dernières lignes de logs ; `Ctrl+C` quitte sans arrêter les services :

```bash
docker compose logs --tail=30 -f backend postgres
```

## 4. Terminal du backend

Avec `backend` démarré, ouvrir son shell ; `exit` permet de quitter :

```bash
docker compose exec backend sh
```

## 5. Commandes PostgreSQL utiles

### Se connecter

Avec `postgres` démarré, ouvrir `psql` avec la base et l’utilisateur du conteneur :

```bash
docker compose exec postgres sh -c 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Les commandes ci-dessous se saisissent dans `psql`. Celles commençant par `\` n’exigent pas de point-virgule ; une requête SQL se termine par `;`.

### Tables et structure

**Les tables métier doivent avoir été créées par les migrations.** Démarrer PostgreSQL ne crée pas `patient`, `seuil` ou `consentement`.

- `\dt` : lister les tables visibles.
- `\dt+` : voir aussi leur taille et leur description.
- `\d` : lister les relations visibles, notamment tables, vues et séquences.
- `\d patient` : voir les colonnes, types, clés et contraintes de Patient.
- `\d seuil` : voir la structure de Seuil.
- `\d consentement` : voir la structure de Consentement.

Les tables métier sont prévues dans `public` ; `\d public.patient` précise le schéma.

Depuis le terminal système, lister les tables sans session interactive :

```bash
docker compose exec postgres sh -c 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt public.*"'
```

### Index, schémas et bases

- `\di` : lister les index visibles.
- `\di public.*` : lister les index du schéma `public`.
- `\dn` : lister les schémas.
- `\l` : lister les bases.
- `\conninfo` : vérifier la connexion, la base et l’utilisateur actuels.

### Historique des migrations

Dans `psql`, consulter les migrations appliquées dans leur ordre d’enregistrement :

```sql
SELECT id, timestamp, name
FROM public.veillo_migrations
ORDER BY id;
```

Cet historique ne liste pas les migrations en attente. Ne pas le modifier manuellement ; TypeORM le crée lors de la gestion des migrations s’il manque.

### Aide et sortie

- `\?` : afficher l’aide des commandes `psql` ; `?` seul ne suffit pas.
- `\q` : quitter sans arrêter PostgreSQL.

## Migrations TypeORM

### Comprendre le parcours

Une migration versionne une évolution du schéma. `up()` l’applique, `down()` prévoit son retour arrière, et `veillo_migrations` conserve les exécutions réussies.

Les fichiers sont dans [persistence/migrations/](../backend/src/persistence/migrations/). Les sept migrations contiennent du SQL pour les ressources et leurs associations. Consentements dépend de Patient et Soignant ; `recevoir` dépend de Soignant et Alerte. Lire le statut local avant toute application.

`synchronize: false` et `migrationsRun: false` sont conservés : le backend ne crée pas automatiquement les tables et ne lance aucune migration au démarrage.

### Créer, générer et vérifier

Créer un squelette en remplaçant `DescriptionEvolution` par un nom explicite en PascalCase :

```bash
docker compose -f compose.yaml -f compose.migrations.yaml run --rm --build migration-tools npm run migration:create -- DescriptionEvolution
```

Générer une migration depuis la différence entre les Entities compilées et une base de référence à jour, sans appliquer le SQL :

```bash
docker compose -f compose.yaml -f compose.migrations.yaml run --rm --build migration-tools npm run migration:generate -- DescriptionEvolution
```

Les fichiers sont écrits dans les sources locales. Sans différence, la génération retourne le code `1` et ne produit aucun fichier. Relire le résultat : seules certaines Entities sont actives ; leur absence pour une table ne signifie pas que cette table doit être supprimée.

Vérifier les noms et l’absence de doublons locaux de nom ou de timestamp :

```bash
docker compose -f compose.yaml -f compose.migrations.yaml run --rm --build migration-tools npm run migration:check
```

Convention : `<timestamp sur 13 chiffres>-DescriptionPascalCase.ts`. Le timestamp ordonne les migrations, mais ne résout pas les dépendances SQL ni les conflits entre développeurs.

### Consulter l’état

Avec PostgreSQL démarré, reconstruire l’outillage puis lire les migrations appliquées (`[X]`) et en attente (`[ ]`), sans démarrer le backend :

```bash
docker compose -f compose.yaml -f compose.migrations.yaml run --rm --build migration-tools npm run migration:show
```

Si le backend est déjà démarré et son image à jour, cette commande reste utilisable :

```bash
docker compose exec backend npm run migration:show
```

Un statut vide dans une ancienne image ne signifie pas que les sources sont vides. `--build` actualise les migrations compilées avant le lancement de l’outillage.

### Appliquer les migrations

**Relire le SQL, vérifier les dépendances et prévoir une sauvegarde adaptée.** La commande applique toutes les migrations en attente, pas seulement celles du développeur qui la lance.

```bash
docker compose -f compose.yaml -f compose.migrations.yaml run --rm --build migration-tools npm run migration:run
```

### Exécuter uniquement Patient

Exemple ciblé, depuis la racine, avec PostgreSQL démarré :

```bash
docker compose -f compose.yaml -f compose.migrations.yaml run --rm --build migration-tools node -e 'const d=require("./dist/persistence/data-source.js").default;d.setOptions({migrations:["dist/persistence/migrations/1794929035067-CreatePatients.js"]});d.initialize().then(async()=>{try{await d.runMigrations()}finally{await d.destroy()}}).catch(e=>{console.error(e);process.exitCode=1})'
```

Cette commande conserve la connexion et l’historique configurés. Elle sélectionne uniquement Patient et l’applique dans une transaction si elle n’est pas déjà enregistrée ; aucune autre migration n’est exécutée.

Le script npm standard ne sélectionne pas une migration par nom. Cet exemple adapte seulement la sélection en mémoire, sans modifier les fichiers du projet. Sa sélection a été vérifiée par lecture du code ; ce n’est pas une preuve d’exécution.

### Travailler à deux

- Récupérer les dernières migrations avant d’en créer une.
- Vérifier noms, timestamps, ordre, tables, colonnes, contraintes et dépendances avant fusion.
- Un timestamp unique n’empêche pas deux migrations de modifier la même table ; coordonner leurs changements avant application.
- Corriger une migration partagée ou appliquée par une nouvelle migration.
- N’appliquer qu’une série à la fois sur une base commune.
- Ne jamais supprimer ou réinitialiser une base pour résoudre un conflit.

Le retour arrière demande de relire `down()` et les dépendances : retirer une table peut supprimer ses données. Les scripts disponibles sont décrits dans [package.json](../backend/package.json) ; ne pas confondre rollback et sauvegarde.

<a id="10-état-actuel-et-limites"></a>

## Vérifications et limites

Les commandes correspondent aux fichiers Compose, au Dockerfile, aux scripts npm et à la configuration TypeORM. Elles n’ont pas été rejouées pour ce nettoyage documentaire.

- Vérifier l’état appliqué sur la base de chaque développeur ; les sources SQL ne prouvent pas leur exécution.
- Utiliser une image à jour : un statut vide avec des migrations non compilées ne prouve pas leur absence des sources.
- En lecture seule, TypeORM peut échouer si `veillo_migrations` manque et qu’il tente de créer cet historique.
