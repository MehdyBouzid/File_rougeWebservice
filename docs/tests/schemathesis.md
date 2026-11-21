# Schemathesis — Guide de travail pour Elamine

Ce guide prépare les tests du TP5 : commencer sur Prism, puis tester les routes NestJS au fil de leur développement.

Les essais rapportés ont utilisé Schemathesis 4.33.4 dans Docker. Ils sont historiques ; les commandes et l’exemple de CI non exécutés sont signalés.

## Rôle de Schemathesis

Schemathesis génère des requêtes à partir d’OpenAPI et compare les réponses au contrat : statuts, en-têtes et JSON. Il complète les cas écrits à la main dans Bruno.

```text
openapi.bundle.yaml ──► Schemathesis ──► requêtes générées ──► Prism (mock) ou backend NestJS
                              ▲                                        │
                              └──── compare la réponse au contrat ◄────┘
```

Les contrôles d’accès (401, 403, 404) nécessiteront le vrai backend : Prism ne vérifie ni les JWT ni les règles métier.

## Ce qui existe déjà

- Le contrat et les outils sont décrits dans [outillage-tp3.md](../outillage-tp3.md). Les résultats et limites des essais Prism/Bruno figurent dans [mock-prism.md](../mock-prism.md#résultats-et-preuves).
- Le backend a des tests Jest, mais ses controllers sont encore vides et le JWT n'est pas implémenté.
- Aucun workflow GitHub Actions ni suite Schemathesis n’est versionné ; les essais ci-dessous utilisent l’image Docker.
- Les consignes officielles du TP5 ne sont pas dans le dépôt : les critères en bas du guide sont à comparer avec le PDF du formateur.

## Le fichier à utiliser

Utilise [openapi.bundle.yaml](../../openapi/openapi.bundle.yaml), le contrat regroupé. Régénère-le depuis les sources avant les essais : voir [les commandes de validation](../outillage-tp3.md#1-génération-du-bundle-et-validation-spectral).

Ne le modifie pas manuellement. Signale à l’équipe les défauts du contrat avant toute correction des sources.

## Installation

Rien à installer, on passe par Docker. Vérifie juste :

```bash
docker run --rm schemathesis/schemathesis:stable --version
```

Vérifie la version affichée : le tag `stable` peut évoluer depuis les essais en 4.33.4. Sur Docker Desktop (Mac, Windows), utilise `host.docker.internal` pour joindre l’hôte.

## Premier essai avec Prism (sans backend)

Terminal 1, depuis la racine : lance Prism. Le `-h 0.0.0.0` est obligatoire pour qu'il soit joignable depuis Docker.

```bash
npx @stoplight/prism-cli mock openapi/openapi.yaml -h 0.0.0.0
```

Terminal 2 :

```bash
docker run --rm -v "$PWD/openapi:/openapi:ro" schemathesis/schemathesis:stable run \
  /openapi/openapi.bundle.yaml \
  --url http://host.docker.internal:4010 \
  -H "Authorization: Bearer test" \
  --phases examples,coverage --mode positive \
  --exclude-checks ignored_auth,unsupported_method,allow_header_conformance
```

Options utilisées :

- `--url` : l'API à tester.
- `-H "Authorization: Bearer test"` : un faux jeton, sinon Prism répond 401.
- `--phases examples,coverage` : joue les exemples du contrat, puis les cas de couverture.
- `--mode positive` : uniquement des données valides.
- `--exclude-checks …` : retire trois contrôles que Prism ne peut pas passer (voir plus bas).

Résultat historique : les deux phases ont terminé avec le code `0`. Ce résultat ne prouve pas que le backend applique les règles métier.

## Pourquoi ces exclusions ?

Les essais ont révélé ces limites de Prism :

- `ST401` : Prism accepte n'importe quel jeton.
- `ST204` : Prism répond 405 sans en-tête `Allow` (déjà noté dans [api-review.md](../api-review.md)).
- `ST105` : pour un JSON mal formé, Prism répond `application/json` au lieu de `application/problem+json`.

Le mode positif évite aussi un plantage de Prism observé avec des données invalides (en-tête `sl-violations`). Ces exclusions ne doivent pas masquer des défauts du vrai backend.

**[À VALIDER]** Les identifiants (`patientId`, `seuilId`…) n’ont pas de type défini. Certains identifiants générés ont entraîné des réponses Prism 405 (`ST103`). Signale ces cas sans inventer de format d’identifiant ; conserve le `--seed <nombre>` affiché pour les reproduire.

## Lire un résultat

Un échec donne un code (ex. `ST103`), la réponse reçue, un `curl` pour le reproduire et un identifiant de rejeu. Pour comprendre un code :

```bash
docker run --rm schemathesis/schemathesis:stable explain ST103
```

La fin du run résume les phases, les échecs et la couverture du contrat.

## Tester une partie seulement

Ajoute l’une de ces options à la commande `run`. Les `operationId` se trouvent dans [paths/](../../openapi/paths/) ; les tags sont `Mesures`, `Patients`, `Alertes`, `Consentements` et `Seuils` :

```bash
--include-operation-id getPatientThreshold
--include-tag Seuils
```

## Contre le backend NestJS, étape par étape

Les routes métier ne sont pas encore implémentées. Teste chaque opération lorsqu’elle devient disponible, plutôt que de lancer toute la suite sur le squelette.

1. **Joindre le backend.** `docker compose up -d --build` (voir [docker.md](../docker.md)), port `3000`. Deux pistes, **non testées** : `--url http://host.docker.internal:3000`, ou rejoindre le réseau du projet avec `--network <réseau> --url http://backend:3000` (nom du réseau : `docker network ls`).
2. **Une route, données valides** : `--include-operation-id listPatients --mode positive --phases examples,coverage`. Commence par les lectures, puis créations et modifications.
3. **Ajouter les données invalides** : retire `--mode positive`. Vérifie les 4xx prévus par le contrat, notamment le 400 pour les propriétés inconnues des requêtes de seuils.
4. **Sécurité, quand le JWT existera** : réactive `ignored_auth` et examine `object_level_authorization`. Un contrôle générique acceptant 401 ou 403 ne suffit pas : vérifie aussi notre distinction [401 / 403 / 404](../api-review.md), avec des identités et objets de test adaptés.
5. **Tout lancer** : sans `--phases`, pour avoir exemples, couverture, fuzzing et tests à état.
6. **Échec accepté par l'équipe** : `--baseline <fichier>` permet de l'enregistrer pour ne pas bloquer. Seulement après décision.

## GitHub Actions

Aucun workflow n’existe actuellement. Cet exemple pour un futur `.github/workflows/schemathesis.yml` reste **à tester** ; il ne valide que le mock :

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
          npx @stoplight/prism-cli mock openapi/openapi.yaml -h 127.0.0.1 &
          for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:4010 && break; sleep 2; done
      - name: Schemathesis contre Prism
        run: |
          docker run --rm --network host -v "$PWD/openapi:/openapi:ro" \
            schemathesis/schemathesis:stable run /openapi/openapi.bundle.yaml \
            --url http://127.0.0.1:4010 -H "Authorization: Bearer test" \
            --phases examples,coverage --mode positive \
            --exclude-checks ignored_auth,unsupported_method,allow_header_conformance
```

Cet exemple cible un runner Ubuntu avec `--network host`. Sur le poste Docker Desktop, utilise la commande avec `host.docker.internal` présentée plus haut.

Un code de sortie non nul fait échouer le job. L’export `--report junit --report-dir <dossier>` reste à essayer ; ne versionne pas `schemathesis-report/` ni `schema-coverage.html`.

## Critères pour valider ton travail

À confirmer avec le PDF du TP5 :

- Une commande documentée, reproductible depuis un clone propre.
- Un run contre Prism qui se termine avec le code `0`, exclusions expliquées.
- Pour chaque opération du backend déjà faite : un run `positive` puis complet ; chaque échec est corrigé côté backend ou signalé.
- Un workflow GitHub Actions vert sur pull request.
- Aucun contrat OpenAPI modifié par toi.
- Un court compte rendu : commandes, échecs rencontrés, décisions.

## Décisions à valider avec l'équipe

**[À VALIDER]**

- Comment authentifier les tests sur le vrai backend (jeton de test, scopes `montre`, `patient`, `soignant`).
- Périmètre de la CI : Prism seul, ou aussi le backend avec PostgreSQL.
- Type des identifiants (`patientId`, `seuilId`…).
- Politique pour les échecs acceptés (`--baseline`) et les rapports.
- Consignes exactes du TP5.
