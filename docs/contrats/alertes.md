# Contrats API — Alertes

Quand une mesure dépasse un seuil, le backend crée une alerte `ACTIVE`, liée à cette mesure et à ce seuil du même patient. Les soignants la consultent et la marquent comme traitée. Ces opérations sont réservées au soignant (scope soignant). Ce guide décrit le contrat attendu, pas une implémentation.

Sources : [opérations alertes](../../openapi/paths/alerts.yaml), [schémas JSON](../../openapi/components/schemas.yaml) et [règles métier](../design.md#6-règles-métier). Les succès utilisent `application/json` et les erreurs `application/problem+json`.

```text
mesure > seuil ──► alerte ACTIVE ──► notification push générique
                        │
          soignant : GET /alerts, GET /alerts/{id}
                        │
                  PATCH ──► TRAITEE (jamais réactivée, conservée dans l'historique)
```

## Lister les alertes

`GET /alerts` renvoie les alertes, actives ou traitées, **des patients que le soignant suit**.

```http
GET /alerts?status=ACTIVE&patientId=patient-001&page=0&size=50 HTTP/1.1
Authorization: Bearer <jeton>
```

Tous les paramètres sont facultatifs : `patientId`, `status` (`ACTIVE` ou `TRAITEE`), `startDate` et `endDate` (période), `page` (à partir de `0`) et `size` (défaut `50`, maximum `100`).

Chaque élément (`AlertSummary`) contient `alertId`, `patientId`, `nomPatient`, `prenomPatient`, `typeMesure`, `horodatage` (RFC 3339 avec fuseau) et `statut` :

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

C’est un élément, pas la réponse paginée complète : l’enveloppe (`AlertPage`) reste à définir. Les valeurs mesurée et de seuil sont réservées au détail.

Les filtres ne peuvent jamais élargir le périmètre : un `patientId` inexistant ou non accessible donne une liste vide en `200`, pas une erreur.

- `200` : alertes récupérées.
- `400` : filtres ou pagination invalides (par exemple `size` > `100`).
- `401` : authentification absente ou invalide.
- `403` : scope soignant manquant.

## Lire une alerte

`GET /alerts/{alertId}` exige le scope soignant, le suivi du patient et un consentement valide.

```http
GET /alerts/alerte-001 HTTP/1.1
Authorization: Bearer <jeton>
```

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

`valeurMesuree` est la valeur qui a déclenché l’alerte, `valeurSeuil` celle du seuil franchi. Aucun identifiant de mesure ni de seuil n’est exposé. `typeMesure` vaut `FREQUENCE_CARDIAQUE`, `SPO2` ou `PAS` (pas depuis le relevé précédent), comme pour les seuils.

- `200` : détail récupéré.
- `401` : authentification absente ou invalide.
- `403` : scope soignant manquant.
- `404` : alerte inexistante ou hors du périmètre du soignant (patient non suivi, consentement valide absent ou retiré).

## Marquer une alerte comme traitée

`PATCH /alerts/{alertId}` acquitte l’alerte. Le soignant doit avoir le scope soignant et suivre le patient concerné.

```http
PATCH /alerts/alerte-001 HTTP/1.1
Authorization: Bearer <jeton>
Content-Type: application/json

{"statut":"TRAITEE"}
```

`statut` est obligatoire et n’accepte que `TRAITEE`. Seule la transition `ACTIVE` → `TRAITEE` existe. La réponse est le détail complet (`AlertDetail`) avec `statut: TRAITEE`.

- `200` : alerte traitée.
- `400` : statut invalide.
- `401` : authentification absente ou invalide.
- `403` : scope soignant manquant.
- `404` : alerte inexistante ou concernant un patient non suivi.
- `409` : alerte déjà traitée ou transition interdite.

## Notifications

La création d’une alerte déclenche une [notification push](../api.md#notifications-des-alertes) générique, sans donnée de santé et sans nouvel endpoint. Le soignant ouvre ensuite le détail avec `GET /alerts/{alertId}`.

## Points à valider

**[À VALIDER]**

- `valeurSeuil` : borne minimale ou maximale franchie, pas l’intervalle complet.
- `horodatage` : date de création de l’alerte, distincte du relevé, pour la liste et le détail.
- Enveloppe et métadonnées de pagination de `AlertPage`.
- Types et formats des identifiants, unités, bornes numériques et format des filtres de période.
- Frontière entre statut invalide (`400`) et transition interdite (`409`).
- Contrôle du consentement pour la liste et pour l’acquittement (s’il est retenu, son absence renvoie `404` ou exclut l’alerte de la liste), et acquittement individuel : le contrat actuel modifie le statut commun de l’alerte.
- Choix des destinataires parmi les soignants concernés : `RECEVOIR` en autorise plusieurs sans définir leur sélection.
- Modalités OAuth/JWT : voir la [définition de sécurité](../../openapi/components/security.yaml).

Ces précisions ne changent pas le MCD et ne définissent pas de calcul ou de stockage.
