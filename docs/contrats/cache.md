# Contrats API — Cache HTTP et requêtes conditionnelles

Ce guide décrit la lecture et la modification conditionnelles des seuils avec `ETag`. Le contrat est défini ; les utilitaires et leur raccordement restent à développer.

Sources : [composants du cache](../../openapi/components/cache.yaml) (source de vérité), [opérations seuils](../../openapi/paths/seuils.yaml) et [guide des seuils](seuils.md#requêtes-conditionnelles-etag). Les erreurs utilisent `application/problem+json`.

## L’idée en deux phrases

L’**`ETag`** identifie l’état du seuil. Le client le renvoie pour relire sans télécharger un JSON inchangé, ou pour modifier sans écraser une écriture concurrente.

Le contrat ne définit pas de `Cache-Control` : aucune durée de conservation n’est imposée au client.

## Pourquoi seulement les seuils ?

L’exigence du formateur reportée dans le projet impose cette protection aux **seuils**, pas aux mesures ou alertes. Le support cité, `tp-06-versioning-cache.pdf` (page 1), suggère les seuils comme évolution v2 ; le PDF n’est pas versionné ici. L’équipe limite le cache conditionnel aux seuils.

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

- **`ETag` :** validateur fort calculé depuis le seuil complet, renvoyé dans les `200`, `201` et `304`. Le client conserve cette valeur opaque entre guillemets et la renvoie telle quelle.
- **`If-None-Match` :** facultatif sur GET, comparaison faible. Même état → `304` sans corps.
- **`If-Match` :** exigé sur PATCH, comparaison forte. État différent → `412` ; en-tête absent → `428`. OpenAPI le marque facultatif pour laisser le backend produire `428`.

## Les réponses, une par une

- **GET `200` :** seuil accessible, `If-None-Match` absent ou différent → JSON et ETag.
- **POST `201` :** seuil créé → JSON, `Location` du GET individuel et ETag utilisable pour un PATCH.
- **GET `304` :** état identique → réutiliser le JSON local ; aucun corps, ETag répété. Possible seulement si le GET aurait donné `200`.
- **PATCH `200` :** modification acceptée → JSON et nouvel ETag à conserver.
- **PATCH `412` :** état périmé → relire le seuil, reprendre la modification sur cet état puis réessayer.
- **PATCH `428` :** `If-Match` absent → obtenir l’ETag avant de modifier.

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

Vérifier les accès avant les préconditions : un `304` ou `412` ne doit pas révéler l’état d’un seuil inaccessible. Le contrat indique cet ordre :

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

**Écart à arbitrer :** les guides laissent l’ordre du `400` de structure ouvert, alors qu’OpenAPI place `428` et `412` avant `400`. Aucune priorité n’est changée ici.

L’écriture atomique future (vérification ETag, verrou de ligne, index unique partiel) est décrite une seule fois dans le [guide des seuils](seuils.md#requêtes-conditionnelles-etag). Pour coder les utilitaires, voir l’[espace de travail cache](../../backend/src/common/cache/README.md).
