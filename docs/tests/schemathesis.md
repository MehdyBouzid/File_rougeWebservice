# Schemathesis — Guide de travail pour Elamine

Schemathesis génère des requêtes depuis OpenAPI et vérifie les réponses HTTP. Commencer sur Prism pour explorer le contrat, puis tester chaque route NestJS lorsqu’elle sera implémentée.

Ce guide prépare les tests du TP5. Les supports officiels ne sont pas présents dans le dépôt : confirmer les critères de livraison avec le PDF du formateur.

## Ce qu’est un test de contrat

Un test de contrat compare un échange réel aux règles décrites dans OpenAPI : statut, en-têtes, type de contenu et structure du JSON.

- **Test unitaire :** vérifie une fonction ou un Service isolé.
- **Test d’intégration :** vérifie plusieurs composants ensemble, par exemple Service, Repository et PostgreSQL.
- **Test de contrat :** vérifie ce qu’un client peut envoyer et recevoir. Il complète les deux précédents et les cas écrits à la main dans Bruno.

```text
OpenAPI → Schemathesis → requêtes générées → Prism ou backend
                              ↑                    │
                              └─ réponses comparées au contrat
```

Schemathesis peut explorer exemples, valeurs limites, données invalides et enchaînements d’opérations. Il ne déduit pas les règles métier qui ne sont pas exprimées dans le contrat.

## État actuel

- Le contrat est dans [openapi/](../../openapi/) ; utiliser le [bundle généré](../../openapi/openapi.bundle.yaml), sans le modifier manuellement.
- Les routes Mesures et Alertes sont codées ; Patients, Seuils et Consentements restent des squelettes. La sécurité JWT et le raccordement des contrôles d’accès restent à réaliser : voir l’[état du backend](../../backend/README.md).
- Les tests Jest existent, mais `test:integration` peut réussir sans test grâce à `--passWithNoTests`. Un code `0` ne suffit donc pas à prouver une couverture.
- Aucun workflow GitHub Actions ni suite Schemathesis dédiée n’est versionné. Les essais consignés utilisent Docker.
- Les résultats et limites Prism/Bruno sont dans [mock-prism.md](../mock-prism.md#résultats-et-preuves).

Le backend [contrôle déjà ses réponses JSON](../../backend/README.md#validation-openapi-des-réponses) avec `express-openapi-validator`. Schemathesis complète ce contrôle depuis l’extérieur : il peut générer des requêtes, examiner les headers et révéler des chemins non couverts par les tests écrits à la main. Il ne garantit pas les règles métier non exprimées dans OpenAPI.

## Préparer les outils

Depuis la racine, suivre le [guide du bundle](../../openapi/bundle.md#générer-et-mettre-à-jour) pour le régénérer puis le valider.

Schemathesis s’utilise via Docker, sans installation Python locale :

```bash
docker run --rm schemathesis/schemathesis:stable --version
```

L’image locale utilisée affiche `4.33.4` ; l’aide `run --help` a été consultée. Le tag `stable` peut évoluer lors d’un prochain téléchargement.

Les essais du parent et du bundle après réorganisation sont consignés dans les [résultats du mock](../mock-prism.md#vérification-du-refactoring-par-ressource). Ils portent sur Prism, pas sur le backend métier.

Sur Docker Desktop (Mac et Windows), `host.docker.internal` permet au conteneur de joindre un service lancé sur l’hôte. Les commandes multi-lignes ci-dessous utilisent la syntaxe Bash.

## Premier essai avec Prism

**Terminal 1, depuis la racine :**

```bash
npx @stoplight/prism-cli mock openapi/openapi.yaml -h 0.0.0.0
```

L’écoute sur `0.0.0.0` rend Prism joignable depuis Docker ; elle peut aussi l’exposer au réseau. Garder le terminal ouvert.

**Terminal 2, depuis la racine :**

```bash
docker run --rm -v "$PWD/openapi:/openapi:ro" schemathesis/schemathesis:stable run \
  /openapi/openapi.bundle.yaml \
  --url http://host.docker.internal:4010 \
  -H "Authorization: Bearer test" \
  --phases examples,coverage --mode positive \
  --exclude-checks ignored_auth,unsupported_method,allow_header_conformance
```

- `--url` fixe l’adresse à tester.
- Le volume `:ro` rend le contrat accessible en lecture seule.
- Le jeton factice satisfait le contrôle de présence de Prism.
- `examples,coverage` joue les exemples et les cas de couverture.
- `positive` génère uniquement des données valides selon les schémas.
- Les trois exclusions évitent des contrôles incompatibles avec le mock.

**Résultat historique :** les deux phases se sont terminées avec le code `0` lors des essais en 4.33.4. Cela ne valide ni le contrat actuel dans son intégralité, ni le backend métier.

### Limites observées sur Prism

- `ST401` : n’importe quel jeton est accepté ; le contrôle `ignored_auth` est exclu pour le mock.
- `ST204` : une méthode non prévue reçoit `405` sans `Allow` ; les contrôles `unsupported_method` et `allow_header_conformance` sont exclus.
- `ST105` : un JSON mal formé a reçu `application/json` au lieu de `application/problem+json`. Ce cas négatif n’est pas couvert par le premier essai positif.

Des données invalides ont aussi provoqué un plantage de Prism autour de `sl-violations`. Ces limites ne doivent pas justifier des exclusions permanentes sur NestJS.

**Point ouvert :** certains identifiants générés ont conduit à des réponses Prism `405` (`ST103`). Le schéma `Identifier` ne fixe pas encore leur type. Signaler ces cas sans inventer de format.

## Tester une seule opération

Ajouter une option à la commande `run` :

```bash
--include-operation-id getPatientThreshold
```

Ou sélectionner le domaine :

```bash
--include-tag Seuils
```

Les `operationId` sont dans les fichiers `paths/` de chaque ressource : voir l’[architecture des contrats](../../openapi/architecture-api.md). Les tags actuels sont `Mesures`, `Patients`, `Alertes`, `Consentements` et `Seuils`.

## Comprendre et reproduire un échec

1. Lire l’opération, la requête envoyée, le statut reçu et le contrôle en échec.
2. Rejouer le `curl` fourni dans le rapport.
3. Conserver le `--seed <nombre>` affiché pour reproduire la génération.
4. Comparer le cas au YAML : défaut du backend, limite du mock ou contrat incomplet ?
5. Signaler à l’équipe les défauts du contrat avant toute modification des sources.

Pour comprendre un code :

```bash
docker run --rm schemathesis/schemathesis:stable explain ST103
```

Lire aussi le nombre d’opérations et de cas réellement exécutés. Les schémas ouverts, notamment les enveloppes de listes, limitent ce que l’outil peut vérifier.

## Passer au backend NestJS

Tester les routes disponibles, pas toute la suite sur des controllers vides. Les créations, modifications et suppressions exigent une base de test isolée avec des données fictives.

Le Compose habituel démarre la base de développement, pas une base de test isolée. Le parcours d’isolation de ces tests backend reste à préparer : avant tout essai d’écriture, vérifier que le backend cible utilise une base distincte. Tant que ce prérequis n’est pas satisfait, rester sur Prism ou des lectures.

1. **Démarrer l’environnement** avec `docker compose up -d --build` et vérifier le port publié avec `docker compose ps`, selon [docker.md](../docker.md).
2. **Joindre le backend.** Pour le port hôte par défaut : `--url http://host.docker.internal:3000`. Autre piste : ajouter `--network veillo_veillo` au `docker run` et utiliser `--url http://backend:3000`. Ces deux parcours Schemathesis restent **non testés**.
3. **Commencer par une lecture implémentée**, par exemple `--include-operation-id listAlerts --mode positive --phases examples,coverage`, puis les opérations d’écriture disponibles.
4. **Explorer les données invalides** en retirant `--mode positive`. Vérifier notamment le `400` prévu pour les propriétés inconnues des requêtes de seuils.
5. **Tester la sécurité** lorsque JWT sera implémenté, avec les identités, scopes et objets de test adaptés. Réactiver `ignored_auth` et examiner `object_level_authorization`.
6. **Élargir les phases** en retirant `--phases` : exemples, couverture, fuzzing et tests à état.

- **Fuzzing :** générer de nombreuses variantes de requêtes pour explorer des cas difficiles à prévoir à la main.
- **Tests à état :** enchaîner des opérations en réutilisant les données obtenues aux étapes précédentes, lorsque les liens du contrat le permettent.

Ne pas conserver automatiquement les exclusions Prism. Le backend doit respecter les en-têtes, les préconditions et notre distinction [401 / 403 / 404](../api-review.md) ; accepter indifféremment `401` ou `403` ne vérifie pas cette politique.

**À valider :** `--baseline <fichier>` enregistre les échecs acceptés pour ne pas bloquer les essais suivants. L’utiliser seulement après accord de l’équipe, pas pour masquer un défaut.

## Place dans la CI

La CI doit rejouer les tests sur les contributions et signaler les régressions. Un échec Schemathesis renvoie un code non nul et fait échouer le job.

Aucun workflow n’est configuré. L’exemple suivant pour un futur `.github/workflows/schemathesis.yml` reste **non exécuté** : il valide seulement le mock sur un runner Ubuntu.

```yaml
name: Schemathesis
on:
  pull_request:
  push:
    branches: [main]

jobs:
  contrat-prism:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Démarrer Prism
        run: |
          npx --yes @stoplight/prism-cli mock openapi/openapi.yaml -h 127.0.0.1 &
          for i in $(seq 1 30); do
            if curl -s -o /dev/null http://127.0.0.1:4010; then
              exit 0
            fi
            sleep 2
          done
          exit 1
      - name: Schemathesis contre Prism
        run: |
          docker run --rm --network host -v "$PWD/openapi:/openapi:ro" \
            schemathesis/schemathesis:stable run /openapi/openapi.bundle.yaml \
            --url http://127.0.0.1:4010 -H "Authorization: Bearer test" \
            --phases examples,coverage --mode positive \
            --exclude-checks ignored_auth,unsupported_method,allow_header_conformance
```

`--network host` concerne ce runner Linux. Sur Docker Desktop, garder le parcours `host.docker.internal` décrit plus haut.

Pour exporter les résultats, les options `--report junit --report-dir <dossier>` existent dans l’aide consultée, mais l’export n’a pas été testé. Ne pas versionner `schemathesis-report/` ni `schema-coverage.html`, et ne pas publier de secrets ou de données de santé dans les rapports.

## Livraison et décisions ouvertes

Critères de travail à confirmer avec le PDF du TP5 :

- Une commande reproductible depuis un clone propre et un essai Prism terminé, avec exclusions expliquées.
- Pour chaque opération backend disponible : essai positif, puis élargi ; échecs corrigés ou signalés.
- Un workflow vert sur pull request et un compte rendu court des commandes, résultats et décisions.
- Aucune modification du contrat OpenAPI sans validation.

**Restent à décider :** authentification des tests réels, types des identifiants, CI limitée au mock ou incluant NestJS/PostgreSQL, politique de baseline et de rapports, exigences exactes du TP5.
