# Tests contractuels — Schemathesis (TP5)

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

- Le contrat est dans [openapi/](..) ; utiliser le [bundle généré](../openapi.bundle.yaml), sans le modifier manuellement.
- Les routes Mesures et Alertes sont codées ; Patients, Seuils et Consentements restent des squelettes. La sécurité JWT et le raccordement des contrôles d’accès restent à réaliser : voir l’[état du backend](../../backend/README.md).
- Les tests sont regroupés dans [backend/test/](../../backend/test). L’intégration Jest vérifie l’assemblage avec un double PostgreSQL ; les tests d’intégration métier restent à développer. `--passWithNoTests` est conservé : vérifier le nombre de tests, pas seulement le code de sortie.
- La configuration et le guide sont regroupés dans ce dossier. Le workflow est réservé mais son job est désactivé ; aucune automatisation des tests n’est opérationnelle.
- Les résultats et limites Prism/Bruno sont dans [mock-prism.md](../../docs/mock-prism.md#résultats-et-preuves).

Le backend [contrôle déjà ses réponses JSON](../../backend/README.md#validation-openapi-des-réponses) avec `express-openapi-validator`. Schemathesis complète ce contrôle depuis l’extérieur : il peut générer des requêtes, examiner les headers et révéler des chemins non couverts par les tests écrits à la main. Il ne garantit pas les règles métier non exprimées dans OpenAPI.

## Espace de développement

- [schemathesis.md](schemathesis.md) : ce guide, les commandes, le diagnostic et les limites.
- [schemathesis.toml](schemathesis.toml) : configuration native de Schemathesis 4.33.4. Elle conserve le contrôle JSON des réponses, déjà actif par défaut, sans recopier les schémas OpenAPI.
- [schemathesis.yml](../../.github/workflows/schemathesis.yml) : emplacement du futur workflow. Il ne se déclenche que manuellement et son job est toujours désactivé. Il n’exécute aucun test et ne constitue pas une preuve de CI.

Le contrat reste [le parent existant](../openapi.yaml) et son [bundle généré](../openapi.bundle.yaml). Aucun contrat spécifique aux tests n’est nécessaire.

La configuration ne fixe ni URL cible, ni jeton, ni exclusion de contrôle. La commande Prism ci-dessous fournit ces options pour le mock uniquement. Depuis la racine, le fichier de configuration doit être indiqué explicitement ; il est aussi accessible dans le volume Docker `/openapi`.

Le collègue responsable devra préparer l’environnement backend isolé, les identités de test, le périmètre des opérations, les rapports et le job CI. Les décisions non validées restent ouvertes.

## Préparer les outils

Depuis la racine, suivre le [guide du bundle](../bundle.md#générer-et-mettre-à-jour) pour le régénérer puis le valider.

Schemathesis s’utilise via Docker, sans installation Python locale :

```bash
docker run --rm schemathesis/schemathesis:stable --version
```

Les commandes ont été utilisées avec Schemathesis `4.33.4`. Le tag `stable` peut évoluer : vérifier la version et l’aide `run --help` si les options changent.

Sur Docker Desktop (Mac et Windows), `host.docker.internal` permet au conteneur de joindre un service lancé sur l’hôte. Les commandes multi-lignes ci-dessous utilisent la syntaxe Bash.

## Premier essai avec Prism

**Terminal 1, depuis la racine :**

```bash
npx @stoplight/prism-cli mock openapi/openapi.yaml -h 0.0.0.0
```

L’écoute sur `0.0.0.0` rend Prism joignable depuis Docker ; elle peut aussi l’exposer au réseau. Garder le terminal ouvert.

**Terminal 2, depuis la racine :**

```bash
docker run --rm -v "$PWD/openapi:/openapi:ro" schemathesis/schemathesis:stable \
  --config-file /openapi/schemathesis/schemathesis.toml run \
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

**Résultat attendu :** les deux phases terminent sans échec. Les [résultats consignés](../../docs/mock-prism.md#résultats-et-preuves) indiquent la couverture réellement exercée ; ils ne valident pas le backend métier.

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

Les `operationId` sont dans les fichiers `paths/` de chaque ressource : voir l’[architecture des contrats](../architecture-api.md). Les tags actuels sont `Mesures`, `Patients`, `Alertes`, `Consentements` et `Seuils`.

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

Le [guide d’intégration](../../docs/tests/integration-testing.md#isoler-et-réinitialiser-les-données) précise l’isolation et la réinitialisation attendues. Le Compose habituel cible la base de développement ; le parcours isolé reste à implémenter. Tant que ce prérequis n’est pas satisfait, rester sur Prism ou des lectures.

1. **Démarrer l’environnement** avec `docker compose up -d --build` et vérifier le port publié avec `docker compose ps`, selon [docker.md](../../docs/docker.md).
2. **Joindre le backend.** Sur Docker Desktop, pour le port hôte par défaut : `--url http://host.docker.internal:3000`. Ce parcours Schemathesis reste **non testé** ; adapter le port publié.
3. **Commencer par une lecture implémentée**, par exemple `--include-operation-id listAlerts --mode positive --phases examples,coverage`, puis les opérations d’écriture disponibles.
4. **Explorer les données invalides** en retirant `--mode positive`. Vérifier notamment le `400` prévu pour les propriétés inconnues des requêtes de seuils.
5. **Tester la sécurité** lorsque JWT sera implémenté, avec les identités, scopes et objets de test adaptés. Réactiver `ignored_auth` et examiner `object_level_authorization`.
6. **Élargir les phases** en retirant `--phases` : exemples, couverture, fuzzing et tests à état.

- **Fuzzing :** générer de nombreuses variantes de requêtes pour explorer des cas difficiles à prévoir à la main.
- **Tests à état :** enchaîner des opérations en réutilisant les données obtenues aux étapes précédentes, lorsque les liens du contrat le permettent.

Ne pas conserver automatiquement les exclusions Prism. Le backend doit respecter les en-têtes, les préconditions et notre distinction [401 / 403 / 404](../../docs/api-review.md) ; accepter indifféremment `401` ou `403` ne vérifie pas cette politique.

**À valider :** `--baseline <fichier>` enregistre les échecs acceptés pour ne pas bloquer les essais suivants. L’utiliser seulement après accord de l’équipe, pas pour masquer un défaut.

## Place dans la CI

La CI doit rejouer les tests sur les contributions et signaler les régressions. Un échec Schemathesis renvoie un code non nul et fait échouer le job.

**Le workflow réservé reste inactif.** Le collègue devra remplacer son job désactivé par un parcours vérifié avant activation. Le parcours envisagé commence par Prism sur un runner Linux ; les tests NestJS/PostgreSQL nécessiteront un environnement isolé.

Le futur job devra démarrer sa cible, attendre qu’elle réponde, puis lancer Schemathesis. Les exclusions Prism ne doivent pas être reprises automatiquement sur le backend. Les branches déclenchant la CI et le périmètre du job restent à valider.

Pour exporter les résultats, les options `--report junit --report-dir <dossier>` existent dans l’aide consultée, mais l’export n’a pas été testé. Ne pas versionner `schemathesis-report/` ni `schema-coverage.html`, et ne pas publier de secrets ou de données de santé dans les rapports.

## Livraison et décisions ouvertes

Critères de travail à confirmer avec le PDF du TP5 :

- Une commande reproductible depuis un clone propre et un essai Prism terminé, avec exclusions expliquées.
- Pour chaque opération backend disponible : essai positif, puis élargi ; échecs corrigés ou signalés.
- Un workflow vert sur pull request et un compte rendu court des commandes, résultats et décisions.
- Aucune modification du contrat OpenAPI sans validation.

**Restent à décider :** authentification des tests réels, types des identifiants, CI limitée au mock ou incluant NestJS/PostgreSQL, politique de baseline et de rapports, exigences exactes du TP5.
