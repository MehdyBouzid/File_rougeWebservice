# Cache HTTP — Espace de travail d’Elamine

Ce dossier prépare les utilitaires du cache HTTP des seuils. Le code et les tests restent à écrire ; aucun Controller ne les utilise actuellement.

## Comprendre le contrat avant de coder

Le [guide du cache](../../../../openapi/cache/cache-contract.md) explique ETag, les préconditions, les réponses `304/412/428`, les exemples HTTP et la sécurité. Le [guide Seuils](../../../../openapi/thresholds/thresholds-contract.md#requêtes-conditionnelles-etag) décrit la transaction et l’unicité du seuil actif.

```text
GET autorisé → JSON + ETag
GET suivant + If-None-Match → 304 sans corps, ou nouveau JSON + ETag
```

Le cache évite de retransmettre un JSON inchangé ; il n’évite pas forcément une lecture PostgreSQL. La politique `Cache-Control` et l’algorithme de calcul de l’ETag restent à valider.

## Fichiers à compléter

- [etag.util.ts](etag.util.ts) : calculer l’ETag et évaluer `If-None-Match`, indépendamment de NestJS et de PostgreSQL.
- [etag.util.spec.ts](etag.util.spec.ts) : remplacer les `it.todo` par des tests unitaires.

Ce squelette prépare ETag et `If-None-Match`. Il ne fournit pas `If-Match` ni l’écriture du PATCH. Aucun module, interceptor ou Redis n’est à ajouter ici.

## Raccorder les utilitaires

Pour le GET individuel d’un seuil, le Controller obtient les données autorisées depuis le Service et prépare la représentation `Threshold`. Il appelle ensuite les utilitaires, puis choisit le statut et les en-têtes.

Les droits d’accès et le consentement requis doivent être contrôlés avant toute réponse conditionnelle. L’utilitaire ne prend aucune décision d’autorisation.

- Ne jamais réutiliser une réponse privée pour un autre utilisateur ou patient ; filtres, pagination et droits font partie du contexte.
- Ne mettre ni JWT ni donnée de santé en clair dans l’ETag ou les logs.
- La durée de fraîcheur ne doit pas permettre de contourner un retrait de consentement. Voir les [précautions du contrat](../../../../openapi/cache/cache-contract.md#vérifier-les-accès-avant-les-préconditions).

## Tests attendus

**Unitaires :** même représentation → même ETag ; représentation modifiée → ETag différent. Tester `If-None-Match` absent, différent ou correspondant, les listes de tags, les tags faibles et `*`, selon HTTP. La comparaison du GET est faible.

**Après raccordement :** vérifier `200` avec JSON, `304` sans corps, les headers, les variations de données et les droits. Un refus d’accès ou un consentement retiré ne doit jamais être contourné par un `304`.

Depuis la racine :

```bash
cd backend
npm run test:unit -- --runTestsByPath src/common/cache/etag.util.spec.ts --runInBand
```

Un TODO ne valide aucun comportement. Le contrat impose un ETag fort calculé depuis les six champs de `Threshold` ; la sérialisation canonique, `If-Match: *` et les en-têtes mal formés restent à préciser.

Les consignes officielles du TP4 ne sont pas versionnées ; ce guide ne leur ajoute aucune exigence.
