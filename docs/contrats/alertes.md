# Contrats API — Alertes

Un dépassement de seuil crée une alerte `ACTIVE`, liée à une mesure et un seuil du même patient. Ce guide décrit sa consultation et son traitement par les soignants, sans attester de leur implémentation.

Sources : [opérations alertes](../../openapi/paths/alerts.yaml), [schémas JSON](../../openapi/components/schemas.yaml) et [règles métier](../design.md#6-règles-métier). Les succès utilisent `application/json` et les erreurs `application/problem+json`.

## Liste des alertes

### `GET /alerts`

Consulter les alertes actives ou traitées des patients suivis par le soignant autorisé.

**Paramètres de requête**

- `patientId` : filtre facultatif sur un patient suivi.
- `status` : filtre facultatif, `ACTIVE` ou `TRAITEE`.
- `startDate` et `endDate` : période facultative.
- `page` : entier à partir de `0`, valeur par défaut `0`.
- `size` : entier, valeur par défaut `50`, maximum `100`.

**JSON attendu**

`AlertSummary` définit sept champs obligatoires :

- `alertId`, `patientId` : identifiants, sans type ni format définitif.
- `nomPatient`, `prenomPatient`, `typeMesure` : chaînes.
- `horodatage` : chaîne RFC 3339 avec fuseau.
- `statut` : `ACTIVE` ou `TRAITEE`.

Exemple d’un élément, pas d’une réponse paginée complète :

```json
{
  "alertId": "alerte-001",
  "patientId": "patient-001",
  "nomPatient": "Exemple",
  "prenomPatient": "Camille",
  "typeMesure": "FREQUENCE_CARDIAQUE",
  "horodatage": "2026-11-20T10:00:00Z",
  "statut": "ACTIVE"
}
```

**[À VALIDER]** Enveloppe et noms des métadonnées de pagination de `AlertPage`. `AlertSummary` n’y est pas rattaché et ne valide pas la réponse complète. Les valeurs mesurée et du seuil sont réservées au détail.

**Réponses prévues**

- `200 OK` : alertes récupérées selon les filtres et la pagination.
- `400 Bad Request` : filtres ou pagination invalides, notamment `size` supérieur à `100`.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : appelant non autorisé à consulter les alertes.

**[À VALIDER]** Contrôle du consentement pour cette liste.

## Détail d’une alerte

### `GET /alerts/{alertId}`

L’accès exige le suivi du patient, les autorisations du soignant et un consentement valide.

**Paramètre de chemin :** `alertId`.

**JSON attendu**

Le schéma `AlertDetail` définit sept champs obligatoires :

- `alertId`, `patientId` : identifiants, sans type ni format définitif.
- `typeMesure` : chaîne indiquant le type de mesure.
- `valeurMesuree` : nombre, valeur ayant déclenché l’alerte.
- `valeurSeuil` : nombre, valeur du seuil déclenché.
- `statut` : `ACTIVE` ou `TRAITEE`.
- `horodatage` : chaîne RFC 3339 avec fuseau.

```json
{
  "alertId": "alerte-001",
  "patientId": "patient-001",
  "typeMesure": "FREQUENCE_CARDIAQUE",
  "valeurMesuree": 125,
  "valeurSeuil": 110,
  "statut": "ACTIVE",
  "horodatage": "2026-11-20T10:00:00Z"
}
```

Les identifiants et `FREQUENCE_CARDIAQUE` sont illustratifs, sans imposer de préfixe ni d’énumération. Aucun `mesureId` ni identifiant de seuil n’est exposé ; les relations du MCD restent internes. Les interprétations ouvertes figurent en fin de document.

**Réponses prévues**

- `200 OK` : détails de l’alerte récupérés.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : suivi, autorisations ou consentement requis non satisfaits.
- `404 Not Found` : alerte introuvable.

## Acquittement d’une alerte

### `PATCH /alerts/{alertId}`

Marquer une alerte comme traitée après sa prise en charge. Le soignant doit suivre le patient concerné et être autorisé à agir.

**Paramètre de chemin :** `alertId`.

**JSON reçu**, selon le schéma `AlertUpdate` :

```json
{
  "statut": "TRAITEE"
}
```

`statut` est obligatoire, avec la seule valeur `TRAITEE`. La transition autorisée est `ACTIVE` vers `TRAITEE`, sans réactivation ni suppression de l’historique.

La réponse utilise `AlertDetail` avec le statut `TRAITEE` ; les autres champs du détail ne sont pas à envoyer dans le PATCH.

**Réponses prévues**

- `200 OK` : alerte traitée, réponse décrite par `AlertDetail`.
- `400 Bad Request` : statut invalide.
- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : soignant non autorisé, notamment s’il ne suit pas le patient.
- `404 Not Found` : alerte introuvable.
- `409 Conflict` : alerte déjà traitée ou transition interdite.

## Décisions à confirmer

**[À VALIDER]** Deux interprétations proposées :

- `valeurSeuil` : borne minimale ou maximale franchie, pas l’intervalle complet.
- `horodatage` : date de création de l’alerte, distincte du relevé, pour la liste comme le détail.

**[À VALIDER]** Autres points ouverts :

- Types et formats des identifiants, valeurs autorisées de `typeMesure`, unités et bornes numériques.
- Format et bornes des filtres de période.
- Frontière entre statut invalide (`400`) et transition interdite (`409`).
- Consentement pour l’acquittement et éventuel acquittement individuel ; le contrat actuel modifie le statut commun de l’alerte.
- Modalités OAuth/JWT : voir la [définition de sécurité](../../openapi/components/security.yaml).

Ces précisions ne changent pas le MCD et ne définissent pas de calcul ou de stockage.

## Notifications

La création d’une alerte déclenche une [notification push](../api.md#notifications-des-alertes) générique, sans donnée de santé ni nouvel endpoint. Le soignant ouvre ensuite le détail via `GET /alerts/{alertId}`.

**[À VALIDER]** Choix des destinataires parmi les soignants concernés. L’association `RECEVOIR` permet plusieurs destinataires mais ne définit pas leur sélection.
