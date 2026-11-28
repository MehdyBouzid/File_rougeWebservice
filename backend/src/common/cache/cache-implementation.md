# Cache HTTP — Guide d’implémentation

Ce dossier prépare le travail d’Elamine sur le cache HTTP des seuils. Les utilitaires ne sont pas implémentés et aucun Controller ne les utilise encore.

Le [contrat du cache](../../../../openapi/cache/cache-contract.md) reste la référence des échanges HTTP, des règles de sécurité et des décisions ouvertes. Le [contrat Seuils](../../../../openapi/thresholds/thresholds-contract.md#requêtes-conditionnelles-etag) décrit la transaction prévue pour les modifications concurrentes.

## Fichiers à compléter

- [etag.util.ts](etag.util.ts) : calculer l’ETag et évaluer `If-None-Match`, indépendamment de NestJS et de PostgreSQL.
- [etag.util.spec.ts](../../../test/unit/common/cache/etag.util.spec.ts) : remplacer les `it.todo` par des tests unitaires.

Ce squelette prépare ETag et `If-None-Match`. Il ne fournit pas `If-Match` ni l’écriture du PATCH. Aucun module, interceptor ou Redis n’est à ajouter ici.

## Où raccorder la logique ?

Le Service conserve les règles métier et les transactions. Les utilitaires restent indépendants des accès aux données et des autorisations. Respecter les [contrôles d’accès avant les préconditions](../../../../openapi/cache/cache-contract.md#vérifier-les-accès-avant-les-préconditions), sans exposer de donnée de santé dans les headers ou les logs.

### GET : lire un seuil

Le Controller obtient les données autorisées depuis le Service et prépare la représentation `Threshold`. Il appelle ensuite les utilitaires, puis choisit le statut et les en-têtes.

### POST : renvoyer l’ETag du seuil créé

```text
Service    → crée le seuil et renvoie son état enregistré
Controller → prépare Threshold → calcule l’ETag
           → 201 + Location + ETag
```

Utiliser le même calcul que pour le GET et le PATCH : un même état enregistré doit produire le même ETag. Calculer depuis l’état enregistré, pas depuis le corps reçu : les colonnes [`NUMERIC(6, 2)`](../../persistence/migrations/1794929035069-CreateThresholds.ts) peuvent arrondir les bornes. La normalisation des nombres reste à valider.

### PATCH : comparer If-Match dans la transaction

Le Controller transmet la valeur de `If-Match` au Service. La comparaison se fait **dans la transaction du Service**, sur la ligne verrouillée. Comparer avant la transaction laisserait une autre modification s’intercaler avant l’écriture.

```text
BEGIN
  SELECT … FOR UPDATE     → seuil absent ou hors périmètre : 404
  If-Match absent         → 428
  calculer l’ETag courant → différent de If-Match : 412
  valider et écrire       → 400 ou 409
COMMIT
Controller → 200 + Threshold + ETag du nouvel état
```

La comparaison est forte : une valeur préfixée par `W/` ne correspond jamais. Elle peut rester une fonction pure à côté des autres utilitaires, appelée par le Service, avec ses tests unitaires. Une erreur annule la transaction. Le [contrat Seuils](../../../../openapi/thresholds/thresholds-contract.md#requêtes-conditionnelles-etag) détaille le verrou et l’index unique ; le contrôle du consentement dans cette transaction reste à valider.

## Risques à traiter avant le raccordement

Les deux comportements ci-dessous ont été reproduits sur une application NestJS minimale, hors dépôt, avec Express `5.2.1`. Aucune correction n’est appliquée dans le projet : **la solution reste à choisir et à valider.**

### Express ajoute son propre ETag

Par défaut, Express ajoute un ETag **faible** aux réponses avec un corps, et répond `304` à un GET dont `If-None-Match` correspond. [main.ts](../../main.ts) ne modifie pas ce [réglage `etag`](https://expressjs.com/en/5x/api/application/#options-for-etag-setting).

Conséquences pour Veillo :

- la liste des seuils reçoit un ETag, alors que le contrat n’en prévoit pas ; les autres routes en reçoivent aussi ;
- un Controller qui oublie de poser son ETag fort renvoie un ETag faible sans erreur visible ;
- un ETag posé par le Controller est conservé, et Express peut alors transformer seul le GET en `304`. Les accès doivent donc être vérifiés avant de préparer la réponse.

Désactiver ce réglage agit sur toutes les routes. À vérifier sur l’application réelle : aucun ETag sur la collection, un ETag fort sur le seuil individuel.

### Le ValidationPipe passe avant le Controller

NestJS exécute les [guards, puis les pipes, puis le Controller](https://docs.nestjs.com/faq/request-lifecycle). Avec un corps validé par le `ValidationPipe` global, un PATCH invalide reçoit `400` avant que le Controller ou le Service puisse répondre `404`, `428` ou `412`. Le contrat exige pourtant `401 → 403 → 404 → 428 → 412 → 400 ou 409`.

- Choisir où valider le corps de ce PATCH pour respecter l’ordre, sans modifier le pipe global sans validation de l’équipe.
- Un contrôle d’`If-Match` placé dans un guard ne remplace pas la comparaison dans la transaction.
- Un JSON mal formé est rejeté en `400` lors de la lecture du corps, avant les guards : ce cas est aussi à arbitrer.

## Tests attendus

Les tests unitaires sont dans [test/unit/common/cache/](../../../test/unit/common/cache/). Les cinq TODO couvrent la stabilité de l’ETag, son changement et les comparaisons `If-None-Match` : valeur absente, différente, correspondante, tags faibles, listes et `*`.

Après raccordement, ajouter les tests HTTP et de persistance nécessaires dans [test/integration/](../../../test/integration/), selon le [guide d’intégration](../../../../docs/tests/integration-testing.md). Vérifier les réponses et headers du contrat, les modifications concurrentes et l’absence de contournement des droits par un `304`. Ne pas considérer les tests HTTP techniques existants comme une preuve du cache réel.

La [commande ciblée du cache](../../../../docs/tests/test-commands.md#cibler-un-fichier) permet de lancer ce fichier seul.

## Travaux restants

- Faire valider les [choix ouverts](../../../../openapi/cache/cache-contract.md#décisions-restant-à-valider), dont le calcul de l’ETag, la sérialisation, `If-Match: *` et `Cache-Control`. Le traitement des en-têtes mal formés reste aussi à préciser.
- Décider comment traiter les [deux risques](#risques-à-traiter-avant-le-raccordement) liés à Express et au `ValidationPipe`.
- Implémenter les utilitaires et remplacer les TODO par des tests réels.
- Raccorder le GET du seuil, l’ETag du POST et la modification conditionnelle du PATCH, avec les accès et la transaction prévus. Les routes Seuils restent à développer.
- Vérifier les résultats sur un environnement de test isolé. Un TODO ne valide aucun comportement.
