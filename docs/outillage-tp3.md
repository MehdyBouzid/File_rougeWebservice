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
- **Dossiers métier** : opérations, composants propres à la ressource et `guide.md`. Par exemple, [measurements/](../openapi/measurements/) rassemble le contrat d’ingestion.
- **[common/](../openapi/common/components/)** : identifiants, types de mesure, pagination et erreurs réellement partagés.
- **[security/](../openapi/security/components/)** : mécanisme Bearer/JWT. Les permissions provisoires restent dans les opérations.
- **[cache/](../openapi/cache/)** : ETag, préconditions et réponses conditionnelles des seuils.
- **[openapi.bundle.yaml](../openapi/openapi.bundle.yaml)** : contrat regroupé, généré par Redocly. Ne pas le modifier à la main.

L’[architecture détaillée](../openapi/architecture-api.md) présente les dossiers, les références `$ref`, un parcours `POST /measurements` et les correspondances avec NestJS.

**Quel fichier modifier ?** Une opération dans le `paths/` de sa ressource ; un JSON dans `components/schemas/` ; une réponse ou un exemple dans son sous-dossier. Les éléments communs restent dans les dossiers transversaux.

```text
modifier les sources → régénérer le bundle → valider → tester
```

Avec la configuration actuelle, **Spectral utilise le bundle** pour éviter le rejet des références de chemins du parent. **Prism charge directement le parent** et ses références.

[.spectral.yaml](../openapi/.spectral.yaml) configure le lint : ce fichier ne fait pas partie du contrat HTTP.

Les guides [Mesures](../openapi/measurements/guide.md), [Seuils](../openapi/thresholds/guide.md) et [Cache](../openapi/cache/guide.md) précisent les échanges. `patientId`, `batchId` et au moins un relevé sont obligatoires ; formats d’identifiants, unités, bornes et autorisations du simulateur restent ouverts.

Conserver la cohérence avec [design.md](design.md), [api.md](api.md) et [api-review.md](api-review.md). Une réorganisation des fichiers ne valide aucune décision métier ou OAuth encore ouverte.

## 1. Génération du bundle et validation Spectral

**Spectral vérifie le contrat et les règles du projet.** L’utiliser après chaque modification des sources, une fois le bundle régénéré par Redocly.

Depuis la racine :

```bash
npx @redocly/cli bundle openapi/openapi.yaml -o openapi/openapi.bundle.yaml
npx @stoplight/spectral-cli lint openapi/openapi.bundle.yaml --ruleset openapi/.spectral.yaml
```

**Résultat attendu :** génération réussie et 0 erreur Spectral. Lire aussi les avertissements. Cela ne teste pas le comportement de NestJS.

Les règles actuelles contrôlent notamment :

- `operation-operationId` : chaque opération possède un identifiant.
- `security-roles-known` : les noms provisoires sont `montre`, `patient` et `soignant`.
- Les réponses HTTP : `WWW-Authenticate` exigé sur les `401`, `Location` déclaré sur les `201` et erreurs en `application/problem+json`.

`oas3-operation-security-defined` est désactivée : la règle native attend des scopes OAuth, alors que le contrat utilise encore Bearer avec des rôles OpenAPI 3.1.

Un essai antérieur avec `authorizationCode`, `clientCredentials` et des URL fictives avait passé Redocly, Spectral et Prism. La règle native réactivée détectait un scope inconnu. **Cet essai ne valide ni ces flux ni un fournisseur OAuth pour Veillo.**

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

### Ce que couvrent les requêtes actuelles

- **01 — Patients :** attend `200` et les propriétés `items` et `pagination`. Cette enveloppe reste ouverte dans le contrat ; ces assertions sont une hypothèse du test.
- **02 — Création d’un seuil :** attend `201`, `Location` et les six champs de `Threshold`, avec `actif: true`.
- **03 — Lot invalide :** attend `400` car `patientId` manque. La note du fichier sur un UUID obligatoire et une SpO₂ limitée à 100 est obsolète : ces contraintes ne sont pas définies.
- **04 à 07 — PATCH d’un seuil :** attendent `200` pour le corps valide, puis `400` pour un corps vide, une valeur nulle et une propriété inconnue.

**Limite actuelle :** les quatre PATCH n’envoient pas `If-Match`. Ils explorent les schémas du mock et ne valident pas le parcours conditionnel prévu, où cet en-tête est exigé et son absence donne `428`.

Pour comprendre un rejet Prism, lire `sl-violations`. La requête 03 utilisait l’exemple fictif `BadRequest` en `application/problem+json` ; son `detail` ne remplace pas le diagnostic réel attendu du backend. Voir les [limites du mock](mock-prism.md#résultats-et-preuves).

## Résultats déjà consignés

Ces résultats sont **historiques** et portent sur des versions successives du contrat :

- **Spectral :** 0 erreur et 0 avertissement après découpage, avant les évolutions Mesures et Alertes.
- **Redocly :** 0 erreur et 2 avertissements : licence absente (`info-license`) et serveur local (`no-server-example.com`).
- **Prism :** 118 appels identiques avant/après découpage : 12 succès, 43 erreurs forcées et 4 requêtes invalides par version. Ce contrôle précède les schémas actuels des relevés et alertes.
- **Bruno :** vérification ciblée des seuils réussie, 5 requêtes et 11 tests. Les requêtes 01 et 03 n’avaient pas été rejouées ; la collection complète n’avait pas été réexécutée après le découpage.

Lors de la révision rédactionnelle précédente, aucun essai HTTP ni nouveau lint n’avait été exécuté. Les aides des CLI Prism et Bruno avaient été consultées pour vérifier les commandes.

Le fichier attendu `docs/mock.png` est absent. Les [captures disponibles](mock-prism.md#résultats-et-preuves) montrent des échanges antérieurs, pas une validation du backend actuel.

## Vérification du refactoring par ressource

Le 25 novembre 2026, la nouvelle [organisation](../openapi/architecture-api.md) a été vérifiée :

- **Équivalence :** mêmes 13 opérations, 19 schémas et définitions d’origine après résolution des références. Les bundles avant/après sont fonctionnellement équivalents.
- **Exemples :** les huit corps initialement déclarés avec `example` utilisent désormais des `examples` référencés. Leurs valeurs sont inchangées.
- **Redocly et Spectral :** aucune erreur. Les avertissements préexistants restent présents : licence absente, serveur local et `AlertSummary` non référencé.
- **Prism :** 77 échanges identiques avant/après, dont les succès, les réponses forcées et une création de seuil invalide.
- **Schemathesis 4.33.4 :** parent et bundle chargés séparément ; 13 opérations testées et 159 cas réussis pour chaque entrée.

Les essais Schemathesis ont utilisé `examples,coverage` en mode positif, avec `--max-examples 1 --max-time 40 --seed 20261125`. Les trois exclusions propres au mock sont celles du [guide Schemathesis](tests/schemathesis.md#premier-essai-avec-prism). Le fuzzing et les tests à état n’ont pas été exécutés.

Ces contrôles portent sur le contrat et Prism. Ils ne prouvent pas l’implémentation des règles métier dans NestJS.

Pour les tests générés depuis le contrat, poursuivre avec [Schemathesis](tests/schemathesis.md).
