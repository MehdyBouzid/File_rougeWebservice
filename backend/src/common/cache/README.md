# Cache HTTP — Espace de travail d’Elamine

Ce dossier est un squelette : Elamine doit encore écrire la logique et les tests. Aucun controller ne l’utilise actuellement.

## À quoi sert le cache HTTP ?

Éviter de renvoyer le même JSON si les données n’ont pas changé. Le client conserve sa réponse et demande à l’API si elle est toujours valable : moins de données transitent sur le réseau.

Cela ne supprime pas forcément les lectures PostgreSQL : le backend peut devoir récupérer les données pour vérifier leur état.

## Les quatre éléments à comprendre

- **`Cache-Control`** indique comment conserver et réutiliser la réponse : `private` interdit le stockage partagé, `no-cache` exige une revalidation, `no-store` interdit le stockage, `max-age` fixe une durée de fraîcheur. La politique de Veillo reste à choisir.
- **`ETag`** identifie une version de la réponse, par exemple `"version-1"`. Cette valeur est illustrative, pas un algorithme retenu.
- **`If-None-Match`** contient l’ETag que le client possède déjà et souhaite faire vérifier.
- **`304 Not Modified`** signifie que le client peut réutiliser son JSON. La réponse n’a pas de corps ; elle conserve les en-têtes nécessaires, dont l’ETag et la politique de cache applicable.

Références : [cache HTTP](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2) et [If-None-Match](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.2).

## Comment se déroule un échange ?

Pour un GET autorisé à utiliser ce mécanisme :

1. Premier appel : le serveur renvoie `200`, le JSON et son ETag. Le client les conserve si la politique le permet.
2. Appel suivant : le client envoie `If-None-Match` avec cet ETag.
3. Le backend revérifie les accès et compare avec la représentation actuelle.
4. Si elle correspond : `304` sans JSON. Sinon : `200` avec le JSON actuel et son ETag.

## Où Elamine doit-il coder ?

- [etag.util.ts](etag.util.ts) : produire l’ETag et comparer `If-None-Match`, avec des fonctions indépendantes de NestJS et de la base.
- [etag.util.spec.ts](etag.util.spec.ts) : remplacer les `it.todo` par de vrais tests unitaires.

Plus tard, le controller obtiendra du Service les données autorisées, préparera le JSON selon les filtres et la pagination, puis appellera ces fonctions. Il choisira le statut et les en-têtes HTTP. Le Service conservera les règles métier ; l’utilitaire ne décidera jamais des droits d’accès. Aucun module, interceptor ou Redis n’est à ajouter ici.

## Précautions pour les patients

- Vérifier l’authentification, les autorisations, le suivi et le consentement requis **avant tout `304`**. Un ETag ne donne aucun droit d’accès.
- Ne pas réutiliser une réponse privée pour un autre utilisateur ou patient, ni activer de cache partagé sans validation. Filtres, pagination et droits font partie du contexte.
- Ne mettre ni JWT ni donnée de santé en clair dans un ETag ou dans les logs.
- Une durée de fraîcheur permet d’éviter un appel serveur : elle peut retarder le contrôle d’un consentement retiré. La politique doit tenir compte de ce risque.

Le consentement est requis pour les mesures et le détail d’une alerte ; son périmètre reste ouvert ailleurs. Voir la [sécurité](../../../../docs/design.md#7-sécurité) et la [revue HTTP](../../../../docs/api-review.md).

## Comment vérifier le travail ?

**Tests unitaires :** même réponse → même ETag ; réponse modifiée → ETag différent ; en-tête absent, différent ou correspondant. Prévoir les listes d’ETag, les tags faibles (`W/`) et `*`, selon HTTP. Sur GET, la comparaison est dite faible : le préfixe `W/` n’empêche pas deux tags de correspondre.

**Tests d’intégration, après raccordement :** `200` avec JSON, `304` sans corps, en-têtes cohérents, variantes de données, filtres, pagination et utilisateur. Un accès refusé ou un consentement retiré ne doit jamais être contourné par un `304`.

Pour lancer le fichier de tests depuis la racine :

```bash
cd backend
npm run test:unit -- --runTestsByPath src/common/cache/etag.util.spec.ts --runInBand
```

Les TODO ne valident aucun comportement tant que les tests ne sont pas écrits.

## Par quoi commencer ?

1. Faire valider les GET concernés et leur politique de conservation et de revalidation.
2. Préciser la construction des ETag : représentation et sérialisation comparées, tags forts ou faibles, traitement des en-têtes mal formés.
3. Documenter les en-têtes et `304` dans le [contrat OpenAPI](../../../../openapi/openapi.yaml) avant de les activer : ils en sont actuellement absents.
4. Développer les utilitaires avec leurs tests, puis les raccorder aux controllers concernés.

Les consignes officielles du TP4 ne sont pas présentes dans le dépôt ; aucun choix supplémentaire n’est imposé par ce guide.
