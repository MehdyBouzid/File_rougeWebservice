# Contrats API — Cache HTTP et requêtes conditionnelles

L’`ETag` identifie l’état d’un seuil. Le client le renvoie pour éviter de télécharger un JSON inchangé ou d’écraser une modification concurrente.

Le contrat est défini ; les utilitaires et leur raccordement aux controllers restent à développer. Source de vérité : [cache.yaml](../../openapi/components/cache.yaml), utilisé par [les opérations seuils](../../openapi/paths/seuils.yaml).

## Périmètre

Le cache conditionnel est limité aux seuils :

- GET individuel : renvoie `ETag` et accepte `If-None-Match`.
- POST : renvoie l’`ETag` du seuil créé, avec `Location`.
- PATCH : exige `If-Match` et renvoie l’`ETag` de l’état obtenu.

La liste `GET /patients/{patientId}/seuils` n’a pas d’`ETag`. Aucune durée de conservation ni politique `Cache-Control` n’est définie.

L’exigence du formateur est reportée dans le projet. Le support cité, `tp-06-versioning-cache.pdf` (page 1), suggère les seuils comme évolution v2 ; ce PDF n’est pas versionné dans le dépôt.

## Le parcours client

```text
GET seuil → 200 + JSON + ETag "A"
    │
    ├─ relire : GET + If-None-Match "A"
    │           ├─ état identique → 304 sans corps
    │           └─ état différent → 200 + JSON + ETag actuel
    │
    └─ modifier : PATCH + If-Match "A"
                  ├─ état toujours "A" → 200 + JSON + ETag obtenu
                  └─ état modifié     → 412 : relire avant de réessayer

PATCH sans If-Match → 428
```

Un `304` invite à réutiliser le JSON déjà détenu. Un `412` demande de relire le seuil et de reprendre la modification sur son état actuel.

## Les trois en-têtes

**`ETag`** est un validateur fort calculé depuis la représentation complète `Threshold`. Le serveur le renvoie dans les réponses GET `200` et `304`, POST `201` et PATCH `200`.

Le client conserve cette valeur opaque entre guillemets et la renvoie telle quelle. Il ne doit pas essayer d’en déduire une version ou une donnée métier.

**`If-None-Match`** est facultatif sur le GET individuel. La comparaison est faible : le préfixe `W/` n’empêche pas deux tags de correspondre. Si l’état correspond, le serveur répond `304` sans corps et répète `ETag`.

**`If-Match`** est exigé sur PATCH et utilise une comparaison forte. Une valeur périmée donne `412` ; son absence donne `428`.

OpenAPI déclare ce paramètre facultatif pour laisser le backend produire `428`, plutôt qu’un rejet préalable par un outil de validation. Cela ne le rend pas facultatif dans l’usage de l’API.

## Exemples HTTP

Les valeurs sont fictives. L’`ETag` et les erreurs viennent des exemples de [cache.yaml](../../openapi/components/cache.yaml). Le JSON complet du seuil figure dans le [guide des seuils](seuils.md#lire-un-seuil).

### Lire sans retélécharger le JSON

Après un premier GET ayant renvoyé `200`, le client envoie l’`ETag` conservé :

```http
GET /patients/patient-001/seuils/seuil-001 HTTP/1.1
Authorization: Bearer <jeton>
If-None-Match: "4b1f0c9e7a3d2e58"
```

Si le seuil est accessible et inchangé :

```http
HTTP/1.1 304 Not Modified
ETag: "4b1f0c9e7a3d2e58"
```

Aucun corps n’est renvoyé. Si l’état diffère, la réponse est `200` avec le JSON actuel et son `ETag`.

### Modifier sans écraser une autre modification

```http
PATCH /patients/patient-001/seuils/seuil-001 HTTP/1.1
Authorization: Bearer <jeton>
If-Match: "4b1f0c9e7a3d2e58"
Content-Type: application/json

{"valeurMax":110}
```

Si la modification est acceptée, `200` renvoie le seuil complet et son `ETag`. Si la représentation change, ce validateur change aussi.

### Gérer une précondition refusée

Si le seuil a changé depuis sa lecture :

```http
HTTP/1.1 412 Precondition Failed
Content-Type: application/problem+json

{
  "type": "about:blank",
  "title": "Précondition non satisfaite",
  "status": 412,
  "detail": "Le seuil a été modifié depuis sa lecture. Exemple fictif sans donnée de santé."
}
```

Si `If-Match` manque :

```http
HTTP/1.1 428 Precondition Required
Content-Type: application/problem+json

{
  "type": "about:blank",
  "title": "Précondition requise",
  "status": 428,
  "detail": "L’en-tête If-Match est obligatoire. Exemple fictif sans donnée de santé."
}
```

Les erreurs utilisent `application/problem+json`.

## Vérifier les accès avant les préconditions

Un `ETag` ne donne aucun droit. Un `304` ou `412` ne doit pas révéler l’état d’un seuil inaccessible.

L’ordre décrit dans OpenAPI est :

```text
authentification absente ou invalide                  → 401
rôle ou scope soignant insuffisant                    → 403
patient inexistant ou non suivi, seuil hors périmètre  → 404
If-Match absent sur PATCH                            → 428
If-Match différent sur PATCH                         → 412
contenu invalide ou conflit de seuil actif            → 400 ou 409
```

Sur GET, évaluer `If-None-Match` seulement après les contrôles d’accès et si la réponse aurait été `200`. Les règles communes sont dans [api.md](../api.md#règles-daccès-communes).

Ne pas partager une réponse privée entre utilisateurs ni exposer de donnée de santé dans les en-têtes ou les logs. La politique de conservation doit aussi tenir compte du retrait du consentement.

## Ce qui reste à développer

Les fichiers de [common/cache/](../../backend/src/common/cache/README.md) préparent le travail d’Elamine sur l’`ETag` et `If-None-Match` : aucun utilitaire n’est encore implémenté. `If-Match` et l’écriture du PATCH restent aussi à développer, puis à raccorder.

Le [guide des seuils](seuils.md#requêtes-conditionnelles-etag) décrit la transaction prévue, le verrou de ligne et l’index unique partiel. Leur rôle est distinct : l’`ETag` protège l’état lu, l’index protège l’unicité du seuil actif.

## Décisions restant à valider

- Algorithme de l’`ETag` et sérialisation canonique : ordre des clés, normalisation des nombres. Le validateur fort sans colonne de version est retenu.
- Traitement de `If-Match: *`.
- `ETag` de collection : non retenu pour l’instant.
- Politique `Cache-Control`.
- Ordre des erreurs de structure : JSON mal formé, corps vide ou propriété inconnue → `400` avant ou après `428` et `412`.
- Périmètre du consentement et contrôle dans la transaction ; s’il est exigé, son absence donne `404`.

**Écart à arbitrer :** les guides laissent l’ordre du `400` de structure ouvert, alors qu’OpenAPI place `428` et `412` avant `400`. Ce guide ne tranche pas cette différence.
