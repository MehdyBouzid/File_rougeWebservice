# Schemathesis — Guide de travail pour Elamine

Objectif : mettre en place Schemathesis (TP5) **sans attendre que le backend soit terminé**. Ce guide prépare ton travail ; il ne contient pas les tests à ta place et ne modifie aucun contrat.

Les commandes ont été essayées avec Schemathesis 4.33.4 (Docker) contre le mock Prism. Ce qui n'est pas essayé est signalé.

## C'est quoi, et pourquoi ?

Schemathesis lit notre contrat OpenAPI, **invente lui-même des centaines de requêtes** (valides et invalides) et vérifie que l'API répond comme le contrat le promet : bons statuts, bons en-têtes, bon JSON.

```text
openapi.bundle.yaml ──► Schemathesis ──► requêtes générées ──► Prism (mock) ou backend NestJS
                              ▲                                        │
                              └──── compare la réponse au contrat ◄────┘
```

Bruno rejoue les cas qu'on a écrits à la main ; Schemathesis trouve ceux auxquels on n'a pas pensé. À terme, il sert aussi à vérifier nos règles d'accès (401, 403, 404).

## Ce qui existe déjà

- Le contrat est validé (Spectral, Redocly), simulé (Prism) et testé à la main (Bruno) : voir [outillage-tp3.md](../outillage-tp3.md).
- Le backend a des tests Jest, mais ses controllers sont encore vides et le JWT n'est pas implémenté.
- Il n'y a **pas** encore de GitHub Actions ni de Schemathesis.
- Les consignes officielles du TP5 ne sont pas dans le dépôt : les critères en bas du guide sont à comparer avec le PDF du formateur.

## Le fichier à utiliser

[openapi/openapi.bundle.yaml](../../openapi/openapi.bundle.yaml) : le contrat en un seul fichier. Ne le modifie pas à la main. Si un défaut du contrat te gêne, note-le et préviens l'équipe : tu ne corriges pas les contrats.

## Installation

Rien à installer, on passe par Docker. Vérifie juste :

```bash
docker run --rm schemathesis/schemathesis:stable --version
```

Tu dois voir `schemathesis, version 4.x`. Sur Docker Desktop (Mac, Windows), un conteneur atteint ton ordinateur avec `host.docker.internal`.

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

En clair :
- `--url` : l'API à tester.
- `-H "Authorization: Bearer test"` : un faux jeton, sinon Prism répond 401.
- `--phases examples,coverage` : joue les exemples du contrat, puis les cas de couverture.
- `--mode positive` : uniquement des données valides.
- `--exclude-checks …` : retire trois contrôles que Prism ne peut pas passer (voir plus bas).

Résultat observé : les deux phases passent, code de sortie `0`.

## Pourquoi ces exclusions ?

Sans elles, Schemathesis signale des échecs qui viennent de **Prism**, pas de notre contrat :

- `ST401` : Prism accepte n'importe quel jeton.
- `ST204` : Prism répond 405 sans en-tête `Allow` (déjà noté dans [api-review.md](../api-review.md)).
- `ST105` : pour un JSON mal formé, Prism répond `application/json` au lieu de `application/problem+json`.

Et `--mode positive` : avec des données invalides, Schemathesis a **fait planter Prism** (erreur sur l'en-tête `sl-violations`). Contre le vrai backend, tous ces contrôles redeviennent utiles.

**À signaler à l'équipe, sans corriger :** les identifiants du contrat (`patientId`, `seuilId`…) n'ont pas de type défini (décision ouverte). Schemathesis y met des valeurs bizarres, et Prism répond parfois 405 (`ST103`). Pour rejouer exactement un run, ajoute `--seed <nombre>` (affiché en fin de run).

## Lire un résultat

Un échec donne un code (ex. `ST103`), la réponse reçue, un `curl` pour le reproduire et un identifiant de rejeu. Pour comprendre un code :

```bash
docker run --rm schemathesis/schemathesis:stable explain ST103
```

La fin du run résume les phases, les échecs et la couverture du contrat.

## Tester une partie seulement

Pendant le développement, vise une route ou un tag (les `operationId` sont dans `openapi/paths/`, les tags sont `Mesures`, `Patients`, `Alertes`, `Consentements`, `Seuils`) :

```bash
--include-operation-id getPatientThreshold
--include-tag Seuils
```

## Contre le backend NestJS, étape par étape

Aujourd'hui le backend ne répond pas encore à ces routes : tout lancer donnerait des centaines d'échecs inutiles. Avance route par route, quand l'équipe les implémente.

1. **Joindre le backend.** `docker compose up -d --build` (voir [docker.md](../docker.md)), port `3000`. Deux pistes, **non testées** : `--url http://host.docker.internal:3000`, ou rejoindre le réseau du projet avec `--network <réseau> --url http://backend:3000` (nom du réseau : `docker network ls`).
2. **Une route, données valides** : `--include-operation-id listPatients --mode positive --phases examples,coverage`. Commence par les lectures, puis créations et modifications.
3. **Ajouter les données invalides** : retire `--mode positive`. Schemathesis vérifie alors que l'API refuse en 4xx (le backend renvoie 400 pour un champ inconnu).
4. **Sécurité, quand le JWT existera** : retire `ignored_auth` des exclusions (il envoie un faux jeton et attend 401 ou 403). Le contrôle `object_level_authorization` existe aussi et colle à notre règle 404.
5. **Tout lancer** : sans `--phases`, pour avoir exemples, couverture, fuzzing et tests à état.
6. **Échec accepté par l'équipe** : `--baseline <fichier>` permet de l'enregistrer pour ne pas bloquer. Seulement après décision.

## GitHub Actions

Pas de workflow existant : crée `.github/workflows/schemathesis.yml`. Base à **tester** (non exécutée ici) :

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

À retenir : `--network host` marche sur un runner Linux (pas sur Docker Desktop) ; un échec Schemathesis donne un code non nul, donc le job échoue ; pour garder un rapport, `--report junit --report-dir <dossier>` existe (à essayer) ; ne commite pas `schemathesis-report/` ni `schema-coverage.html`.

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
