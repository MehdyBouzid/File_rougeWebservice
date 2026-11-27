# TP3 — Outillage du contrat OpenAPI

Ce guide explique où modifier le contrat de Veillo, puis comment le valider et l’utiliser sans backend. Pour les essais HTTP et le dépannage Bruno, voir le [guide Prism](mock-prism.md).

**Prérequis :** Node.js 22, npm avec `npx` et un terminal ouvert à la racine du dépôt. Le premier téléchargement des outils nécessite un accès réseau.

<a id="1-organisation-du-contrat-openapi"></a>

## Architecture des contrats OpenAPI

**OpenAPI 3.1 décrit les échanges HTTP attendus** : routes, paramètres, JSON, réponses et exigences d’accès. Le contrat commun est maintenant organisé par ressource métier.

```text
openapi.yaml → ressource/paths/ → ressource/components/
                                       ↓
                              common/ · security/ · cache/
```

- **[openapi.yaml](../openapi/openapi.yaml)** : point d’entrée, informations générales et références.
- **Dossiers métier** : opérations, composants propres à la ressource et `<ressource>-contract.md`. Par exemple, [measurements/](../openapi/measurements/) rassemble le contrat d’ingestion.
- **[common/](../openapi/common/components/)** : identifiants, types de mesure, pagination et erreurs réellement partagés.
- **[security/](../openapi/security/components/)** : mécanisme Bearer/JWT. Les permissions provisoires restent dans les opérations.
- **[cache/](../openapi/cache/)** : ETag, préconditions et réponses conditionnelles des seuils.
- **[Bundle](../openapi/bundle.md)** : génération du contrat regroupé et utilisation par les outils.

L’[architecture détaillée](../openapi/architecture-api.md) présente les dossiers, les références `$ref`, un parcours `POST /measurements` et les correspondances avec NestJS.

**Quel fichier modifier ?** Une opération dans le `paths/` de sa ressource ; un JSON dans `components/schemas/` ; une réponse ou un exemple dans son sous-dossier. Les éléments communs restent dans les dossiers transversaux.

```text
modifier les sources → régénérer le bundle → valider → tester
```

Le [guide Spectral](../openapi/spectral.md) explique le lint et sa configuration. Prism charge directement le parent et ses références, comme indiqué dans la section 3.

Les guides [Mesures](../openapi/measurements/measurements-contract.md), [Seuils](../openapi/thresholds/thresholds-contract.md) et [Cache](../openapi/cache/cache-contract.md) précisent les échanges. `patientId`, `batchId` et au moins un relevé sont obligatoires ; formats d’identifiants, unités, bornes et autorisations du simulateur restent ouverts.

Conserver la cohérence avec [design.md](design.md), [api.md](api.md) et [api-review.md](api-review.md). Une réorganisation des fichiers ne valide aucune décision métier ou OAuth encore ouverte.

## 1. Génération du bundle et validation Spectral

Après chaque modification des sources :

1. [Générer le bundle](../openapi/bundle.md#générer-et-mettre-à-jour) : regrouper le contrat avec Redocly.
2. [Lancer Spectral](../openapi/spectral.md#lancer-les-vérifications) : vérifier le contrat et les règles de Veillo.

Ces deux guides regroupent les commandes, les résultats attendus et les corrections à effectuer. Les contrôles statiques ne prouvent pas le fonctionnement de NestJS.

## 2. Documentation Redocly

**Redocly vérifie et regroupe les sources, puis peut générer une documentation HTML.** Utiliser le lint pour contrôler le parent et `build-docs` pour produire une page à consulter ou partager.

Depuis la racine :

```bash
npx @redocly/cli lint openapi/openapi.yaml
npx @redocly/cli build-docs openapi/openapi.yaml -o docs/index.html
```

**Résultat attendu :** aucune erreur, avertissements examinés et page lisible dans [index.html](index.html). Le fichier versionné est actuellement vide : la page reste à générer.

## 3. Mock Prism

**Prism simule les échanges HTTP depuis OpenAPI, sans lancer NestJS.** L’utiliser après validation du contrat pour préparer les clients et tester leurs requêtes.

Depuis la racine :

```bash
npx @stoplight/prism-cli mock openapi/openapi.yaml
```

**Résultat attendu :** 13 opérations annoncées et écoute sur `http://127.0.0.1:4010`. Garder le terminal ouvert ; `Ctrl+C` arrête le mock.

Prism vérifie les schémas et renvoie des exemples statiques : le corps reçu ne reflète pas forcément les données envoyées. Sans `Authorization: Bearer …`, il répond `401`.

Il ne vérifie ni signature JWT, ni scopes, ni droits, ni consentement, ni persistance. Il ne prouve pas non plus les doublons, la comparaison des bornes ou l’unicité du seuil actif.

## 4. Client Bruno

**Bruno envoie des requêtes HTTP et vérifie leurs réponses avec des assertions.** L’utiliser une fois Prism démarré.

La collection [tp3-mock/](../bruno/tp3-mock/) contient sept requêtes. L’environnement [mock.bru](../bruno/environments/mock.bru) fournit `baseUrl = http://127.0.0.1:4010`, `patientId`, `seuilId` et un jeton factice.

Dans un second terminal, depuis la racine :

```bash
cd bruno
npx @usebruno/cli run tp3-mock --env mock
```

**Résultat attendu :** statuts, en-têtes et JSON conformes aux assertions. Un échec peut aussi révéler un test obsolète.

Les [cas testés, assertions et limites](mock-prism.md#ce-que-couvrent-les-requêtes-actuelles) sont centralisés dans le guide Prism/Bruno.

## Résultats déjà consignés

Ces résultats statiques sont historiques et portent sur des versions successives du contrat :

- **Spectral :** 0 erreur et 0 avertissement après découpage, avant les évolutions Mesures et Alertes.
- **Redocly :** 0 erreur et 2 avertissements : licence absente (`info-license`) et serveur local (`no-server-example.com`).

Un essai antérieur de relecture n’avait exécuté ni nouveau lint ni essai HTTP ; seules les aides des CLI Prism et Bruno avaient été consultées.

## Vérification du refactoring par ressource

Le 25 novembre 2026, le découpage par ressource a été vérifié :

- **Équivalence :** mêmes 13 opérations, 19 schémas et définitions d’origine après résolution des références. Les bundles avant/après sont fonctionnellement équivalents.
- **Exemples :** les huit corps initialement déclarés avec `example` utilisent désormais des `examples` référencés. Leurs valeurs sont inchangées.
- **Redocly et Spectral :** aucune erreur. Les avertissements préexistants restent présents : licence absente, serveur local et `AlertSummary` non référencé.

Les [essais HTTP avant/après et Schemathesis](mock-prism.md#vérification-du-refactoring-par-ressource) sont conservés avec les preuves du mock. Ils ne prouvent pas le fonctionnement métier de NestJS.

## Validation à l’exécution dans NestJS

Spectral et Redocly vérifient les fichiers. Le backend utilise séparément [express-openapi-validator](../backend/README.md#validation-openapi-des-réponses) pour contrôler les réponses JSON émises à partir du bundle.

Les requêtes restent validées par les DTO. Les options, tests réalisés et limites du contrôle des réponses sont décrits dans le guide backend ; [Schemathesis](tests/schemathesis.md) vérifie les échanges depuis l’extérieur.
