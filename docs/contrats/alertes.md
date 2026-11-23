# Contrats API — Alertes

Une alerte signale le dépassement d’un seuil applicable. Elle est liée à une mesure et à un seuil **du même patient** ; une mesure peut déclencher plusieurs alertes.

Les routes restent à implémenter. Sources : [opérations alertes](../../openapi/paths/alerts.yaml), [schémas JSON](../../openapi/components/schemas.yaml) et [règles métier](../design.md#6-règles-métier).

```text
dépassement → alerte ACTIVE → notification générique au soignant concerné
                    ↓
         consultation → PATCH → TRAITEE
```

Une alerte traitée est conservée et ne peut pas être réactivée.

## Accès et formats

Les trois opérations exigent le scope soignant et le suivi du patient. Le détail exige aussi un consentement valide ; son contrôle reste ouvert pour la liste et le PATCH.

Les succès utilisent `application/json` et les erreurs `application/problem+json`. Les identifiants des exemples sont fictifs et ne fixent pas leur format.

## Lister les alertes

`GET /alerts` renvoie les alertes actives et traitées des patients suivis.

```http
GET /alerts?status=ACTIVE&patientId=patient-001&page=0&size=50 HTTP/1.1
Authorization: Bearer <jeton>
```

Tous les paramètres sont facultatifs :

- `patientId` : patient à filtrer.
- `status` : `ACTIVE` ou `TRAITEE`. Le filtre s’appelle `status`, le champ JSON `statut`.
- `startDate` et `endDate` : période.
- `page` : entier à partir de `0`, défaut `0`.
- `size` : entier, défaut `50`, maximum `100`.

**Un élément `AlertSummary` :**

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

Ces sept champs sont obligatoires. Ce JSON représente un élément, pas la réponse paginée complète : l’enveloppe `AlertPage` reste à définir. Les valeurs mesurée et de seuil sont réservées au détail.

Un filtre ne donne aucun droit supplémentaire. Un `patientId` inexistant ou inaccessible renvoie une liste vide en `200`.

**Réponses prévues**

- `200` : liste récupérée.
- `400` : filtres ou pagination invalides.
- `401` : authentification absente ou invalide.
- `403` : rôle ou scope soignant insuffisant.

## Lire une alerte

`GET /alerts/{alertId}` exige un consentement valide en plus du scope et du suivi.

```http
GET /alerts/alerte-001 HTTP/1.1
Authorization: Bearer <jeton>
```

**Réponse `AlertDetail` :**

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

Ces sept champs sont obligatoires :

- `alertId` et `patientId` identifient l’alerte et son patient.
- `typeMesure` vaut `FREQUENCE_CARDIAQUE`, `SPO2` ou `PAS`, comme pour les seuils. `PAS` correspond aux pas depuis le relevé précédent.
- `valeurMesuree` et `valeurSeuil` sont des nombres.
- `statut` vaut `ACTIVE` ou `TRAITEE`.
- `horodatage` est une chaîne RFC 3339 avec fuseau.

Aucun identifiant de mesure ou de seuil n’est exposé. Ces relations restent prises en compte côté backend.

**Interprétations proposées, à confirmer :** `valeurSeuil` serait la borne minimale ou maximale réellement franchie ; `horodatage` serait la date de création de l’alerte, distincte de celle du relevé. Seule l’interprétation d’`horodatage` concerne aussi la liste, qui n’expose pas `valeurSeuil`.

**Réponses prévues**

- `200` : détail récupéré.
- `401` : authentification absente ou invalide.
- `403` : rôle ou scope soignant insuffisant.
- `404` : alerte inexistante, patient non suivi ou consentement valide absent, sans distinction.

## Marquer une alerte comme traitée

`PATCH /alerts/{alertId}` acquitte l’alerte, c’est-à-dire la marque comme prise en charge.

```http
PATCH /alerts/alerte-001 HTTP/1.1
Authorization: Bearer <jeton>
Content-Type: application/json

{"statut":"TRAITEE"}
```

`AlertUpdate` exige `statut` avec la seule valeur `TRAITEE`. Le soignant doit suivre le patient ; le contrôle du consentement pour cette action reste à valider.

La réponse `200` reprend `AlertDetail` avec `statut: TRAITEE`. Le contrat modifie l’état commun de l’alerte, pas un état par soignant.

**Réponses prévues**

- `200` : alerte traitée.
- `400` : statut invalide.
- `401` : authentification absente ou invalide.
- `403` : rôle ou scope soignant insuffisant.
- `404` : alerte inexistante ou patient non suivi.
- `409` : alerte déjà traitée ou transition interdite, y compris lors d’un nouvel appel.

## Notifications

La [notification push prévue](../api.md#notifications-des-alertes) ne contient aucune donnée de santé. Le soignant la sélectionne puis consulte `GET /alerts/{alertId}`.

Le webhook signé demandé par le sujet reste à définir, ainsi que son articulation avec le push : voir la [conception](../design.md#contrats-techniques).

## Points à valider

- Interprétation de `valeurSeuil` et de `horodatage`, unités et bornes numériques.
- Enveloppe et métadonnées de `AlertPage`, types d’identifiants et format des filtres de période.
- Frontière entre statut invalide (`400`) et transition interdite (`409`).
- Consentement sur la liste et le PATCH : s’il est exigé, son absence exclut l’alerte de la liste ou donne `404` en accès direct.
- Acquittement individuel : aucun état par soignant n’est défini dans le contrat actuel.
- Sélection des destinataires : `RECEVOIR` en permet plusieurs sans imposer lesquels notifier.
- Modalités [OAuth/JWT](../../openapi/components/security.yaml).

**Écart à arbitrer :** le PATCH renvoie le même détail que le GET protégé, alors que son contrôle du consentement reste ouvert. Voir la [conception](../design.md#périmètre-du-contrôle-du-consentement) ; aucun droit n’est changé dans ce guide.
