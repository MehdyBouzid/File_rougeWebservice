# TP3 — Outillage du contrat OpenAPI

Ce document décrit comment valider, documenter et mocker `openapi.yaml`. Il faut Node.js 22 ; les outils passent par `npx`, sans installation globale.

## 1. Documentation Redocly

```bash
npx @redocly/cli build-docs openapi.yaml -o docs/index.html
```

`docs/index.html` est un fichier autonome : on peut l'ouvrir directement dans un navigateur.

`npx @redocly/cli lint openapi.yaml` affiche **1 warning compris et accepté** (`no-server-example.com`). Le serveur pointe vers `http://localhost:3000`, comme le demande le TP.

## 2. Mock Prism

```bash
npx @stoplight/prism-cli mock openapi.yaml   # http://127.0.0.1:4010
```

## 3. Client Bruno

- La collection est dans `bruno/` et l'environnement dans `bruno/environments/mock.bru` (`baseUrl = http://127.0.0.1:4010`, `patientId`, `token` factice).
- Les requêtes du TP3 sont dans `bruno/tp3-mock/`.
- Exécution en ligne de commande, depuis `bruno/` :

```bash
npx @usebruno/cli run tp3-mock --env mock
```

| Requête | Opération | Statut renvoyé par Prism |
|---|---|---|
| `01-lister-patients` | `listerPatientsSuivis` | `200 OK`, page générée à partir des schémas et exemples |
| `02-creer-seuil` | `creerSeuil` | `201 Created`, avec l'en-tête `Location` |
| `03-lot-invalide` | `ingererLotMesures` | `400 Bad Request` en `application/problem+json` |

### Que renvoie Prism pour un corps invalide ?

Prism compare la requête au contrat avant de répondre. Le corps envoyé contient `batchId: "pas-un-uuid"` et `spo2: 140`. Prism le rejette avec **400**, le premier code d'erreur client prévu par l'opération, et utilise l'exemple de `components/responses/Probleme`.

Les violations détectées sont listées dans l'en-tête `sl-violations` :

```
batchId must match format "uuid"
measurements.0.spo2 must be <= 100
```

Le corps renvoyé est l'**exemple statique** du contrat. Son `detail` ne décrit donc pas la vraie erreur. Seul le futur serveur NestJS pourra renvoyer un détail exact.

Prism vérifie aussi la sécurité : sans en-tête `Authorization: Bearer …`, il répond **401**.

La capture d'une réponse dans Bruno est enregistrée dans `docs/mock.png`.
