# Contrats API — Cache HTTP et requêtes conditionnelles

Ce guide explique comment fonctionnent `ETag`, `If-None-Match`, `If-Match` et les réponses `304`, `412` et `428`. Il décrit le contrat attendu, pas une implémentation existante.

Sources : [composants du cache](../../openapi/components/cache.yaml) (source de vérité), [opérations seuils](../../openapi/paths/seuils.yaml) et [guide des seuils](seuils.md#requêtes-conditionnelles-etag). Les erreurs utilisent `application/problem+json`.

## L’idée en deux phrases

L’API donne à chaque seuil une étiquette, l’**`ETag`**. Le client la renvoie ensuite pour dire « donne-moi le seuil seulement s’il a changé » (lecture) ou « modifie-le seulement s’il n’a pas changé depuis ma lecture » (modification).

- En lecture, cela évite de retransmettre un JSON identique.
- En modification, cela évite d’écraser le travail d’un autre soignant sans le savoir.

Le contrat ne définit pas de `Cache-Control` : aucune durée de conservation n’est imposée au client.

## Pourquoi seulement les seuils ?

Le document du formateur `tp-06-versioning-cache.pdf` (page 1, « Ce qui change selon votre sujet ») désigne, pour le sujet 6 Santé, les seuils comme évolution v2 suggérée et le seuil comme ressource protégée par `ETag`. Cette protection est **obligatoire**. Le formateur ne l’impose ni sur les alertes ni sur les mesures, et l’équipe a choisi de s’en tenir aux seuils pour ne pas complexifier le projet. Aucun `ETag`, `If-Match` ni `304` n’est donc à prévoir ailleurs.

## Routes concernées

- `GET /patients/{patientId}/seuils/{seuilId}` : renvoie le seuil et son `ETag` ; accepte `If-None-Match`.
- `POST /patients/{patientId}/seuils` : renvoie aussi l’`ETag` du seuil créé.
- `PATCH /patients/{patientId}/seuils/{seuilId}` : exige `If-Match` et renvoie le nouvel `ETag`.

La liste `GET /patients/{patientId}/seuils` n’est pas concernée : elle n’a pas d’`ETag`.

## Le parcours type

```text
GET seuil ──► 200 + ETag "A"
   │
   ├─ relire    : GET + If-None-Match "A" ──► 304 (inchangé)
   │                                      └─► 200 + nouvel ETag (modifié)
   │
   └─ modifier  : PATCH + If-Match "A" ──► 200 + ETag "B"  (inchangé depuis "A")
                                       └─► 412            (modifié entre-temps)
                  PATCH sans If-Match ──► 428
```

## Les trois en-têtes

**`ETag`** (en réponse). C’est l’étiquette du seuil, une valeur opaque entre guillemets, par exemple `"4b1f0c9e7a3d2e58"`. Elle est calculée par le backend à partir de la représentation complète du seuil et change dès qu’une valeur change. Le client la garde et la renvoie telle quelle, sans l’interpréter. Elle est présente dans les réponses `200`, `201` et `304`.

**`If-None-Match`** (en requête, sur le `GET`, facultatif). Le client y met l’`ETag` qu’il possède déjà. Si le seuil n’a pas changé, il reçoit un `304` sans corps. La comparaison est faible (RFC 9110).

**`If-Match`** (en requête, sur le `PATCH`, exigé). Le client y met l’`ETag` du seuil qu’il a lu. Si le seuil a changé depuis, la modification est refusée. La comparaison est forte (RFC 9110). OpenAPI le déclare facultatif pour que `428` reste atteignable avec les outils de validation, mais le backend l’exige.

## Les réponses, une par une

**`200` sur le `GET`.** Le seuil est accessible et `If-None-Match` est absent ou différent. Le corps est le seuil, avec son `ETag`. Le client le conserve pour la suite.

**`201` sur le `POST`.** Le seuil vient d’être créé. La réponse porte `Location` (l’adresse du `GET` individuel) et l’`ETag`, donc le client peut modifier le seuil tout de suite sans le relire.

**`304` sur le `GET`.** `If-None-Match` correspond à l’état courant : le client réutilise son JSON. Pas de corps, mais l’`ETag` est répété. Un `304` n’est possible que si la requête aurait abouti en `200`.

**`200` sur le `PATCH`.** `If-Match` était valide et la modification est acceptée. La réponse contient le seuil modifié et un **nouvel** `ETag`, à utiliser pour le prochain `PATCH`.

**`412` sur le `PATCH`.** `If-Match` ne correspond plus à l’état courant : quelqu’un a modifié le seuil entre-temps. Le client relit le seuil (`GET`), reprend sa modification sur la nouvelle version, puis réessaie.

**`428` sur le `PATCH`.** `If-Match` est absent alors que la modification l’exige. Le client doit d’abord lire le seuil pour obtenir son `ETag`.

## Exemples

Les valeurs sont fictives ; les `ETag` et les corps d’erreur reprennent mot pour mot les exemples de `cache.yaml`.

**Lire un seuil**

```http
GET /patients/patient-001/seuils/seuil-001 HTTP/1.1
Authorization: Bearer <jeton>
```

```http
HTTP/1.1 200 OK
ETag: "4b1f0c9e7a3d2e58"
Content-Type: application/json

{"seuilId":"seuil-001","patientId":"patient-001","typeMesure":"FREQUENCE_CARDIAQUE","valeurMin":60,"valeurMax":100,"actif":true}
```

**Relire sans changement (`304`)**

```http
GET /patients/patient-001/seuils/seuil-001 HTTP/1.1
Authorization: Bearer <jeton>
If-None-Match: "4b1f0c9e7a3d2e58"
```

```http
HTTP/1.1 304 Not Modified
ETag: "4b1f0c9e7a3d2e58"
```

**Modifier avec `If-Match`**

```http
PATCH /patients/patient-001/seuils/seuil-001 HTTP/1.1
Authorization: Bearer <jeton>
If-Match: "4b1f0c9e7a3d2e58"
Content-Type: application/json

{"valeurMax":110}
```

La réponse `200` renvoie le seuil modifié avec un nouvel `ETag`, différent du précédent.

**Seuil modifié entre-temps (`412`)**

```http
HTTP/1.1 412 Precondition Failed
Content-Type: application/problem+json

{"type":"about:blank","title":"Précondition non satisfaite","status":412,"detail":"Le seuil a été modifié depuis sa lecture. Exemple fictif sans donnée de santé."}
```

**`If-Match` oublié (`428`)**

```http
HTTP/1.1 428 Precondition Required
Content-Type: application/problem+json

{"type":"about:blank","title":"Précondition requise","status":428,"detail":"L’en-tête If-Match est obligatoire. Exemple fictif sans donnée de santé."}
```

## Contrôles d’accès avant toute réponse conditionnelle

Un `ETag` ne donne aucun droit d’accès. Les contrôles d’accès passent donc toujours en premier : sinon un `304` ou un `412` révélerait l’état d’un seuil à un appelant non autorisé. L’ordre est le suivant.

```text
1. jeton absent ou invalide ................................ 401
2. scope soignant manquant .................................. 403
3. patient non suivi ou inexistant, seuil d'un autre patient 404
4. If-Match absent (PATCH) .................................. 428
5. If-Match différent de l'ETag courant (PATCH) .............. 412
6. contenu invalide (400), puis seuil actif déjà présent (409)
```

Sur le `GET`, `If-None-Match` n’est évalué qu’après les contrôles 1 à 3, et seulement si la réponse aurait été `200`. Ces règles d’accès sont celles du [guide des seuils](seuils.md) et des [règles communes](../api.md#règles-daccès-communes).

## Décisions restant à valider

**[À VALIDER]** Points encore ouverts, issus du contrat et du guide des seuils :

- Algorithme exact de l’`ETag` et sérialisation canonique de l’empreinte (ordre des clés, normalisation des nombres). Le contrat impose seulement un validateur fort calculé depuis la représentation, sans colonne de version.
- Traitement de `If-Match: *`.
- `ETag` sur la liste des seuils : non retenu pour l’instant.
- Politique `Cache-Control` : non définie par le contrat.
- Erreurs de structure détectables sans accès aux données (JSON mal formé, corps vide, propriété inconnue) : `400` avant `428` et `412`, ou après.
- Consentement : contrôle dans la même transaction, et périmètre selon les opérations. S’il est retenu, son absence renvoie `404`.

**Mécanisme backend futur, non implémenté.** Pour éviter les écritures concurrentes, le `PATCH` devra vérifier l’`ETag` et écrire dans une même transaction (verrou de ligne, index unique partiel pour l’unicité du seuil actif). Voir le [guide des seuils](seuils.md#requêtes-conditionnelles-etag).
