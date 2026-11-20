# Backend Veillo — Infrastructure NestJS

Les six modules métier sont enregistrés dans `AppModule`. Les Controllers délèguent aux Services ; aucune route ni règle métier n’est implémentée par ce squelette.

- Mehdy : `patients`, `thresholds`, `consents`.
- Ethan : `measurements`, `alerts`, `caregivers`.

## Démarrer et vérifier

Toutes les commandes ci-dessous se lancent depuis la racine du dépôt. Les consultations ont été vérifiées ; installation, démarrage, arrêt, build et tests ne sont pas exécutés lors de cet audit. Voir [le détail des vérifications](../docs/docker.md#10-état-actuel-et-limites).

Avec Docker Desktop démarré (commandes de mise en route, non exécutées pendant cet audit) :

```bash
[ -f .env ] || cp .env.example .env
# Renseigner DB_PASSWORD dans .env avant le premier démarrage.
docker compose up -d --build
```

Si `.env` existe déjà, le conserver. Les ports hôtes sont configurables dans ce fichier. Les commandes, la connexion et les migrations sont détaillées dans [Infrastructure Docker](../docs/docker.md).

Pour développer hors conteneur avec Node.js 22, PostgreSQL doit rester démarré. Arrêter seulement le backend Docker avant de réutiliser son port HTTP (commandes non exécutées pendant cet audit) :

```bash
docker compose stop backend
npm --prefix backend ci
npm --prefix backend run persistence:sync
(cd backend && node --env-file=../.env node_modules/@nestjs/cli/bin/nest.js start --watch)
```

Le serveur utilise `PORT`, ou 3000 par défaut. Sans route déclarée, `/` répond 404.

```bash
npm --prefix backend run build
npm --prefix backend test
npm --prefix backend run test:infrastructure
```

## Simuler des montres connectées

Le script IoT Node.js envoie des lots conformes à `POST /measurements`. Il utilise les
valeurs par défaut `patient-001`, `patient-002` et `patient-003`, trois montres et un
envoi toutes les 60 secondes.

```bash
npm --prefix backend run iot:simulate -- --once
npm --prefix backend run iot:simulate -- --count 5 --patients patient-001,patient-002
```

Utilisez `API_URL`, `PATIENT_IDS`, `WATCH_COUNT`, `IOT_INTERVAL_MS` ou
`IOT_AUTHORIZATION` pour configurer le simulateur. Pour un envoi continu :

```bash
npm --prefix backend run iot:simulate
```

## Enregistrement des entités

`@nestjs/typeorm` et `typeorm` sont installés. Chaque module importe `TypeOrmModule.forFeature(...)` avec son entrée du registre `src/persistence/feature-entities.generated.ts`. Les listes sont actuellement vides : aucun repository métier n’est créé.

Le registre est généré depuis les dossiers `src/features/<ressource>/entities/`. `persistence:check` a été testé en lecture seule ; `persistence:sync` écrit le registre et n’a pas été exécuté pendant cet audit :

```bash
npm --prefix backend run persistence:sync
npm --prefix backend run persistence:check
```

Le générateur lit les fichiers `*.entity.ts`, y compris les sous-dossiers. Il reconnaît les classes exportées par leur nom et décorées avec `@Entity()` ou `@ViewEntity()`, via un import nommé depuis `typeorm` (alias d’import accepté). Il n’exécute pas les fichiers et ne crée aucune entité.

Depuis la racine, les hooks de `npm --prefix backend run build`, `npm --prefix backend start`, `npm --prefix backend run start:dev` et `npm --prefix backend test` synchronisent le registre. Après l’ajout ou le renommage d’une entité pendant le mode watch, relancer `npm --prefix backend run persistence:sync` puis redémarrer le serveur. Les modifications des champs d’une entité déjà enregistrée ne demandent pas de modifier les modules.

Le fichier généré ne doit pas être édité manuellement. Le périmètre reste limité aux six ressources existantes et à la source de données TypeORM par défaut. Les `EntitySchema`, imports namespace, connexions nommées et réexports d’entités ne sont pas pris en charge par ce générateur.

## Connexion PostgreSQL et migrations

Le pilote `pg` et le module central `DatabaseModule` configurent désormais la connexion avec les variables d’environnement. Dans Compose, le backend utilise `postgres:5432` ; depuis la machine hôte, les paramètres sont ceux du `.env` local.

Le registre reste vide : les classes préparatoires non décorées ne sont pas enregistrées. Aucune table métier n’est créée. Les futures entités devront comporter leurs colonnes et leur clé primaire validées avant l’ajout de `@Entity()`.

La configuration commune à NestJS et à la CLI TypeORM conserve `synchronize: false` et `migrationsRun: false`. Les migrations seront générées puis relues et appliquées explicitement ; voir [la procédure](../docs/docker.md#migrations-typeorm).

Les tests unitaires et le test HTTP du squelette remplacent uniquement le module de connexion pour rester indépendants de PostgreSQL. Ils ne constituent pas une preuve de persistance.

## Consulter l’environnement existant

Commandes vérifiées sans changement de données :

```bash
docker compose config --quiet
docker compose ps -a
docker compose logs --tail=30 backend postgres
docker compose exec -T backend sh -c 'pwd; node --version'
docker compose exec -T -e PGOPTIONS='-c default_transaction_read_only=on' postgres sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\l" -c "\dt public.*"'
npm --prefix backend run migration:check
docker compose exec -T -e PGOPTIONS='-c default_transaction_read_only=on' backend npm run migration:show
```

Le backend répond sur `http://127.0.0.1:3000` et PostgreSQL sur `127.0.0.1:55432`. Les sources contiennent six squelettes non exécutables avant complétion ; le conteneur actuel n’en contient aucun compilé. Un statut vide dans ce conteneur ne signifie pas que les sources sont vides. Aucun rebuild ni migration n’a été lancé pendant cet audit.

## Travailler dans une ressource

- `controllers/` : endpoints HTTP et délégation aux Services.
- `services/` : règles métier et collaboration avec la persistance.
- `entities/` : véritables classes persistées, avec les décorateurs TypeORM définis à partir du modèle validé.
- `dto/` : données d’entrée et validation ; un DTO ne constitue pas automatiquement une entité de stockage.
- `repositories/` : réservé aux besoins spécifiques. Utiliser d’abord les repositories standards de TypeORM, injectés dans le Service une fois une vraie entité et la connexion disponibles. L’accès aux données ne doit pas porter les règles métier.

Les modules exportent uniquement leur Service existant. Ajouter un nouveau Controller, un provider supplémentaire ou une dépendance entre ressources peut toujours nécessiter une modification du module. Ces cas ne sont pas automatisés et doivent être revus pour éviter les dépendances circulaires.

Les commentaires pédagogiques sont limités aux Controllers et Services d’Ethan. Les explications propres aux futurs DTO, Entities et éventuels repositories personnalisés seront placées lors de leur création ; aucun fichier fictif n’est ajouté pour les accueillir.
