# Revue des réponses HTTP — Veillo

Ce document justifie les statuts et les en-têtes retenus. Les [parcours API](api.md) donnent la vue d’ensemble ; les guides par ressource expliquent les JSON. Les [YAML OpenAPI](../openapi/openapi.yaml) restent la référence contractuelle.

## Règles HTTP communes

### Authentification et accès

Les 13 opérations déclarent `401` et `403` :

- **`401`** : authentification absente ou invalide. `WWW-Authenticate` est obligatoire ; l’exemple commun vaut `Bearer`. Les paramètres du challenge restent à préciser avec OAuth.
- **`403`** : appelant authentifié, mais rôle ou scope insuffisant pour l’opération (BFLA). Ce code ne traduit pas l’appartenance d’un objet.
- **`404`** : objet inexistant ou hors du périmètre autorisé (BOLA), en lecture comme en écriture. Les causes ne sont pas distinguables.

Les scopes sont distincts pour montre, patient et soignant. Un soignant n’accède qu’à ses patients ; un patient ne gère que ses consentements.

Le consentement est vérifié à chaque accès concerné. Là où il est exigé, son absence ou son retrait donne `404` en accès direct ou exclut l’objet d’une collection. Son [périmètre par opération](design.md#périmètre-du-contrôle-du-consentement) reste à harmoniser.

### Collections et validation

Les collections ne retournent que les objets accessibles, indépendamment des filtres. Sur Patients et Alertes, un filtre hors périmètre donne une liste vide en `200`.

La pagination documentée utilise `page=0`, `size=50` et une taille maximale de `100`. Les formats d’enveloppe restent ouverts selon les ressources.

- **`400`** : corps ou paramètres invalides.
- **`409`** : conflit documenté, par exemple lot déjà reçu, seuil actif existant ou alerte déjà traitée.

### Créations et réponses sans corps

Les deux `201` exigent `Location` pour identifier la ressource créée. L’URI du lot reste à définir ; celle du seuil désigne son GET individuel. Cela n’impose pas d’ajouter un endpoint.

Le retrait de consentement renvoie `204` sans corps. Un `304` ne contient pas de corps non plus et répète l’ETag.

### Erreurs RFC 9457

Les erreurs documentées utilisent `application/problem+json` et le schéma `Problem` :

- `type` identifie le problème ; `title` en donne un libellé général.
- `status` correspond au statut HTTP.
- `detail` et `instance` sont facultatifs.
- Aucun secret, détail SQL ou donnée de santé ne doit être exposé.

Références : [RFC 9110 — challenge d’authentification](https://www.rfc-editor.org/rfc/rfc9110.html#section-11.6.1) et [RFC 9457 — Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html#section-3.1).

## Erreurs techniques et décisions ouvertes

`405` avec `Allow`, `415` pour un média refusé et `500` pour une erreur interne ne sont pas encore déclarés par opération. Leur ajout reste à valider ; le code existant ne valide pas à lui seul une évolution du contrat.

`422` n’est pas nécessaire pour remplacer les validations décrites avec `400`. `429` dépendrait d’une limitation de débit, non décidée. `304`, `412` et `428` sont déclarés uniquement pour les seuils.

## Contrat, mock et backend

Prism simule le contrat ; ses réponses forcées ne prouvent pas les règles métier. Ses [écarts observés](mock-prism.md#écarts-http-observés) et les preuves sont conservés dans le guide du mock.

Le backend possède un [filtre RFC 9457](../backend/README.md#erreurs-http) et une [validation OpenAPI des réponses](../backend/README.md#validation-openapi-des-réponses). Ces mécanismes ne fournissent ni OAuth/JWT ni les contrôles d’accès métier.

Les sections suivantes décrivent les comportements attendus. L’[état du backend](../backend/README.md) distingue ce qui est codé et ce qui reste à raccorder.

## `POST /measurements`

- `201` : lot validé et enregistré atomiquement, avec `Location`.
- `400` : données invalides ; un seul relevé invalide fait rejeter tout le lot.
- `404` : patient inexistant ou non autorisé pour l’émetteur.
- `409` : `batchId` déjà enregistré, contenu identique ou différent ; aucune mesure supplémentaire.

Les `401/403` concernent ici l’émetteur et son scope montre. Le [guide Mesures](../openapi/measurements/measurements-contract.md#4-réponses-http-prévues) précise les champs requis et les décisions restantes : identité, rattachement, identifiants, unités, bornes, stockage, corps du `201` et URI de `Location`.

## `GET /patients/{patientId}/measurements`

- `200` : mesures correspondant à la période et à la page demandées.
- `400` : période ou pagination invalide, notamment `size > 100`.
- `404` : patient inexistant, non suivi ou sans consentement valide.

Les `401/403` concernent le soignant. Les formats des filtres de dates restent ouverts : voir le [guide Mesures](../openapi/measurements/measurements-contract.md#5-consulter-les-mesures-dun-patient).

## `GET /patients`

- `200` : liste paginée des patients suivis.
- `400` : pagination invalide.

Les `401/403` concernent le soignant. Si le contrôle du consentement est retenu, les patients sans consentement valide seront exclus : [point à valider](../openapi/patients/patients-contract.md#points-à-valider).

## `GET /patients/{patientId}`

- `200` : identité du patient suivi.
- `404` : patient inexistant ou non suivi.

Les `401/403` concernent le soignant. Le consentement reste à confirmer pour cette lecture ; s’il est exigé, son absence donnera aussi `404`.

## `GET /alerts`

- `200` : alertes actives et traitées des patients accessibles, filtrées et paginées.
- `400` : filtres ou pagination invalides.
- Filtre `patientId` inexistant ou inaccessible : liste vide en `200`, sans élargissement des droits.

Les `401/403` concernent le soignant. Le consentement de cette liste reste ouvert : voir le [guide Alertes](../openapi/alerts/alerts-contract.md#lister-les-alertes).

## `GET /alerts/{alertId}`

- `200` : détail de l’alerte.
- `404` : alerte inexistante, patient non suivi ou consentement valide absent.

Les `401/403` concernent le soignant. Le [détail](../openapi/alerts/alerts-contract.md#lire-une-alerte) exige explicitement suivi et consentement.

## `PATCH /alerts/{alertId}`

- `200` : alerte passée à `TRAITEE`, avec `AlertDetail`.
- `400` : statut transmis invalide.
- `404` : alerte inexistante ou patient non suivi.
- `409` : alerte déjà traitée ou transition interdite, y compris lors d’un nouvel appel.

Les `401/403` concernent le soignant. La frontière `400/409` et le consentement restent à préciser. Le statut commun de l’alerte ne définit pas d’acquittement individuel ; aucune réactivation n’est prévue. Voir les [points ouverts](../openapi/alerts/alerts-contract.md#points-à-valider).

## `GET /patients/me/consents`

`200` renvoie les consentements du patient identifié par son jeton, jamais ceux d’un autre patient. Les `401/403` concernent l’authentification et le scope patient, sans identifiant de patient fourni en paramètre.

Le [JSON de consultation](../openapi/consents/consents-contract.md#consulter-ses-consentements) reste à définir.

## `DELETE /patients/me/consents/{consentId}`

- `204` : retrait enregistré, sans corps.
- `404` : consentement inexistant ou appartenant à un autre patient.

Les `401/403` concernent le patient. Le retrait conserve le consentement, sa trace et l’historique des données, tout en bloquant les accès futurs concernés. Un [retrait répété](../openapi/consents/consents-contract.md#points-à-valider) reste à décider.

## `GET /patients/{patientId}/seuils`

- `200` : seuils actifs et désactivés du patient.
- `404` : patient inexistant ou non suivi.

Les `401/403` concernent le soignant. Le consentement reste à valider pour toutes les opérations Seuils.

## `GET /patients/{patientId}/seuils/{seuilId}`

- `200` : seuil et ETag courant.
- `304` : `If-None-Match` correspond ; aucun corps, ETag répété.
- `404` : patient inexistant ou non suivi, seuil inexistant ou d’un autre patient.

Les `401/403` concernent le soignant. Évaluer `If-None-Match` après les accès et seulement si la réponse aurait été `200`. Voir le [contrat du cache](../openapi/cache/cache-contract.md).

## `POST /patients/{patientId}/seuils`

- `201` : seuil créé actif, avec `Threshold`, `Location` vers son GET et ETag.
- `400` : propriété obligatoire absente, type invalide, valeur nulle, propriété inconnue ou `valeurMin > valeurMax`.
- `404` : patient inexistant ou non suivi.
- `409` : un seuil actif du même type existe déjà pour le patient.

Les `401/403` concernent le soignant. L’égalité des bornes est autorisée ; voir le [JSON de création](../openapi/thresholds/thresholds-contract.md#créer-un-seuil).

## `PATCH /patients/{patientId}/seuils/{seuilId}`

- `200` : seuil modifié, représentation complète et ETag.
- `400` : corps vide, valeur nulle, type invalide, propriété inconnue ou bornes finales invalides.
- `404` : patient inexistant ou non suivi, seuil inexistant ou d’un autre patient.
- `409` : activation en conflit avec un autre seuil actif du même type.
- `412` : `If-Match` ne correspond plus à l’état courant.
- `428` : `If-Match` absent.

Les `401/403` concernent le soignant. L’ordre contractuel retenu est :

```text
401 → 403 → 404 → 428 → 412 → 400 ou 409
```

`If-Match` est déclaré facultatif dans OpenAPI pour laisser le backend produire `428`. Il reste obligatoire dans l’usage de l’API.

Après fusion du PATCH avec l’état conservé, le backend vérifie les bornes et l’unicité du seuil actif. Désactiver conserve le seuil ; patient et type de mesure ne sont pas modifiables.

La [transaction prévue](../openapi/thresholds/thresholds-contract.md#requêtes-conditionnelles-etag) doit réunir contrôle de l’ETag et écriture. L’index unique partiel existe dans la migration ; cela ne prouve ni l’application locale du SQL ni le fonctionnement du PATCH.
