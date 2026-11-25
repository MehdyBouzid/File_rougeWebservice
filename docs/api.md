# Conception de l'API REST — Veillo

Cette vue d’ensemble décrit les opérations et traitements prévus, encore à implémenter. Pour les codes HTTP, lire la [revue des réponses](api-review.md) ; pour modifier et valider le YAML, suivre le [guide OpenAPI](outillage-tp3.md#1-organisation-du-contrat-openapi).

## Contrats par domaine

Les guides métier détaillent les JSON, exemples et décisions ouvertes :

- [Mesures : ingestion IoT et consultation](../openapi/measurements/guide.md).
- [Patients](../openapi/patients/guide.md).
- [Alertes](../openapi/alerts/guide.md).
- [Consentements](../openapi/consents/guide.md).
- [Seuils](../openapi/thresholds/guide.md), dont ETag et requêtes conditionnelles.
- [Cache HTTP et requêtes conditionnelles](../openapi/cache/guide.md), limité aux seuils.

## Règles d’accès communes

- `401` : authentification absente ou invalide.
- `403` : appelant authentifié dont le rôle ou le scope est insuffisant. Ce contrôle porte sur le droit d’appeler l’opération (BFLA). Les clients ont des scopes distincts : **montre** pour l’ingestion, **patient** pour les consentements, **soignant** pour les patients, mesures, alertes et seuils. Les noms exacts sont provisoires.
- `404` : objet inexistant ou hors du périmètre autorisé, en lecture comme en écriture. Ce contrôle porte sur l’objet demandé (BOLA) : un patient non suivi, un seuil d’un autre patient ou le consentement d’un autre patient sont traités comme inexistants.
- Les collections ne retournent que les objets accessibles, quels que soient les filtres transmis (liste vide en `200` pour un filtre hors périmètre).
- Le consentement du patient est vérifié à chaque accès concerné ; son périmètre par opération reste à valider. Là où il est exigé, son absence ou son retrait donne `404`.

---

## 1. Ingestion des mesures

### `POST /measurements`

Enregistrer les mesures envoyées par les montres connectées pour assurer le suivi des patients.

**Appelant :** Simulateur IoT (scope montre).

**Données reçues**

- `patientId` : identifiant du patient auquel toutes les mesures du lot sont rattachées.
- `batchId` : identifiant unique du lot.
- `measurements` : tableau non vide de relevés contenant chacun :
  - `horodatage` : chaîne de date et heure au format RFC 3339, avec un fuseau horaire.
  - `frequenceCardiaque` : nombre.
  - `spo2` : nombre représentant la saturation en oxygène.
  - `pas` : entier, nombre de pas depuis le relevé précédent, et non un compteur cumulé.

Les trois champs du lot et les quatre champs du relevé sont obligatoires. Types d’identifiants, unités et bornes restent ouverts.

Exemple de lot fictif envoyé par le simulateur toutes les minutes :

```json
{
  "patientId": "patient-001",
  "batchId": "lot-001",
  "measurements": [
    {
      "horodatage": "2026-11-19T10:00:00Z",
      "frequenceCardiaque": 75,
      "spo2": 98,
      "pas": 120
    }
  ]
}
```

Ces identifiants sont illustratifs. Chaque nouveau lot reçoit un nouveau `batchId`.

**Traitement côté API**

1. Authentifier l’émetteur (`401`), vérifier son scope montre (`403`) puis le patient autorisé pour cet émetteur (`404`). Le mécanisme de rattachement reste à définir.
2. Valider tout le lot : un relevé invalide le fait rejeter entièrement.
3. Refuser tout `batchId` déjà enregistré (`409`), contenu identique ou différent, sans nouvelle mesure. Sinon poursuivre.
4. Enregistrer le lot et ses mesures pour ce patient dans une transaction : tout ou rien. Le stockage des lots reste à définir.
5. Vérifier les seuils applicables.

L’ordre et les garanties techniques entre persistance, seuils et alertes restent ouverts : voir la [conception](design.md#contrats-techniques).

---

## 2. Consultation des mesures

### `GET /patients/{patientId}/measurements`

Récupérer les mesures d’un patient sur une période donnée pour suivre leur évolution.

**Appelant :** Soignant (scope soignant).

**Paramètres**

- `patientId` : identifiant du patient (chemin).
- `startDate` : début de la période (requête).
- `endDate` : fin de la période (requête).
- `page` : numéro de page, à partir de 0 (défaut : `0`).
- `size` : nombre de mesures par page (défaut : `50`, maximum : `100`).

**Données retournées**

Horodatage, fréquence cardiaque, SpO₂, pas et pagination : page actuelle, taille et total de pages. L’enveloppe JSON reste à définir ; voir le [guide des mesures](../openapi/measurements/guide.md#5-consulter-les-mesures-dun-patient).

**Traitement côté API**

1. Vérifier le scope soignant (`403` sinon).
2. Vérifier que le patient existe, que le soignant le suit et que le consentement est valide ; sinon `404`.
3. Valider les paramètres de période et de pagination.
4. Récupérer les mesures correspondant aux critères demandés.

---

## 3. Liste des patients

### `GET /patients`

Afficher les patients suivis par le soignant connecté.

**Appelant :** Soignant (scope soignant).

**Paramètres**

- `page` : numéro de page, à partir de 0 (défaut : `0`).
- `size` : nombre de patients par page (défaut : `50`, maximum : `100`).

**Données retournées**

Identifiant, nom, prénom, date de naissance et informations de pagination. Le JSON reste à définir dans le [guide Patients](../openapi/patients/guide.md).

**Traitement côté API**

1. Identifier le soignant connecté et vérifier son scope (`403` sinon).
2. Limiter la liste aux patients liés par `SUIVRE`. Le contrôle du consentement reste ouvert dans ce contrat, à harmoniser avec l’exigence du sujet.
3. Appliquer la pagination.

---

## 4. Détail d'un patient

### `GET /patients/{patientId}`

Consulter les informations d’un patient suivi.

**Appelant :** Soignant (scope soignant).

**Paramètres**

- `patientId` : identifiant du patient (paramètre de chemin).

**Données retournées**

Identifiant, nom, prénom et date de naissance ; JSON à définir.

**Traitement côté API**

1. Vérifier le scope soignant (`403` sinon).
2. Vérifier que le patient existe et que le soignant connecté le suit ; sinon `404`.
3. Retourner les informations du patient.

---

## 5. Consultation des alertes

### `GET /alerts`

Afficher les alertes des patients suivis, qu’elles soient actives ou déjà traitées.

**Appelant :** Soignant (scope soignant).

**Paramètres**

- `patientId` : filtrer par patient (facultatif).
- `status` : filtrer par statut (facultatif).
- `startDate` : début de la période (facultatif).
- `endDate` : fin de la période (facultatif).
- `page` : numéro de page, à partir de 0 (défaut : `0`).
- `size` : nombre d'alertes par page (défaut : `50`, maximum : `100`).

**Données retournées**

Identifiants de l’alerte et du patient, nom et prénom du patient, type de mesure, horodatage et statut. Voir `AlertSummary` dans le [guide Alertes](../openapi/alerts/guide.md#lister-les-alertes).

**Traitement côté API**

1. Identifier le soignant connecté et vérifier son scope (`403` sinon).
2. Récupérer les alertes concernant uniquement les patients qu'il suit.
3. Appliquer les filtres éventuels sans jamais élargir ce périmètre (un filtre `patientId` hors périmètre donne une liste vide).
4. Appliquer la pagination.
5. Retourner les alertes correspondantes.

---

## 6. Consultation du détail d'une alerte

### `GET /alerts/{alertId}`

Consulter les détails d’une alerte pour identifier le patient concerné et la mesure qui l’a déclenchée.

**Appelant :** Soignant (scope soignant).

**Paramètres**

- `alertId` : identifiant de l'alerte (chemin).

**Données retournées**

Identifiants de l’alerte et du patient, type de mesure, valeur mesurée, valeur du seuil, horodatage et statut. Le [guide Alertes](../openapi/alerts/guide.md#lire-une-alerte) décrit `AlertDetail` et les interprétations encore proposées.

**Traitement côté API**

1. Identifier le soignant connecté et vérifier son scope (`403` sinon).
2. Vérifier que l'alerte existe, que le soignant suit le patient concerné et que le consentement est valide ; sinon `404`.
3. Retourner les détails de l'alerte.

---

## Notifications des alertes

Informer le soignant lorsqu’une nouvelle alerte est créée pour l’un de ses patients.

**Déclenchement prévu**

`Dépassement → alerte ACTIVE → notification push au soignant concerné`.

**Contenu**

Message générique : « Une nouvelle alerte nécessite votre attention. Connectez-vous à Veillo pour la consulter. »

Aucune donnée de santé ne doit apparaître dans la notification (patient, mesure ou valeur).

**Consultation**

Le soignant sélectionne la notification puis appelle `GET /alerts/{alertId}`. Le choix des destinataires reste ouvert.

**Point manquant :** le sujet prévoit aussi un webhook signé. Son contrat et son lien avec le push ne sont pas définis ; aucune livraison n’est implémentée.

---

## 7. Acquittement d'une alerte

### `PATCH /alerts/{alertId}`

Marquer une alerte comme traitée après sa prise en charge par le soignant.

**Appelant :** Soignant (scope soignant).

**Paramètres**

- `alertId` : identifiant de l'alerte (chemin).

**Données reçues**

- `statut` : nouveau statut, avec la valeur `TRAITEE`.

**Traitement côté API**

1. Identifier le soignant connecté et vérifier son scope (`403` sinon).
2. Vérifier que l'alerte existe et que le soignant suit le patient concerné ; sinon `404`. Le consentement reste à valider pour cette action.
3. Vérifier que l'alerte n'a pas déjà été traitée (`409`).
4. Mettre à jour le statut de l'alerte.

**Règles métier**

`ACTIVE → TRAITEE`, sans réactivation ; les alertes traitées sont conservées. Le PATCH retourne `AlertDetail`, alors que son contrôle du consentement reste ouvert : [écart à arbitrer](design.md#périmètre-du-contrôle-du-consentement).

---

## 8. Consultation des consentements

### `GET /patients/me/consents`

Consulter les consentements donnés par le patient connecté.

**Appelant :** Patient authentifié (scope patient).

**Paramètres**

Aucun.

**Données retournées**

Identifiant du consentement, identifiant du soignant, date de début, date de fin si renseignée et état. Le JSON et les règles de dates restent à définir : voir le [guide Consentements](../openapi/consents/guide.md).

**Traitement côté API**

1. Identifier le patient connecté à partir de son authentification et vérifier son scope (`403` sinon).
2. Récupérer ses consentements.
3. Retourner les informations correspondantes.

---

## 9. Retrait du consentement

### `DELETE /patients/me/consents/{consentId}`

Retirer un consentement précédemment donné pour mettre fin aux accès concernés.

**Appelant :** Patient authentifié (scope patient).

**Paramètres**

- `consentId` : identifiant du consentement à retirer.

**Traitement côté API**

1. Identifier le patient connecté et vérifier son scope (`403` sinon).
2. Vérifier que le consentement existe et lui appartient ; sinon `404`, sans distinguer les deux cas.
3. Enregistrer le retrait en conservant la trace du consentement et de son retrait.
4. Empêcher les accès futurs aux données concernés par ce consentement.

Le retrait ne supprime ni le consentement ni l’historique des données.

---

## 10. Consultation des seuils

### `GET /patients/{patientId}/seuils`

Consulter les seuils configurés pour surveiller les mesures d’un patient.

**Appelant :** Soignant (scope soignant).

**Paramètres**

- `patientId` : identifiant du patient (chemin).

**Données retournées**

- `seuilId` : identifiant du seuil.
- `patientId` : identifiant du patient.
- `typeMesure` : `FREQUENCE_CARDIAQUE`, `SPO2` ou `PAS`, enum commune aux alertes.
- `valeurMin` et `valeurMax` : nombres.
- `actif` : booléen.

Chaque élément contient ces six propriétés. L’enveloppe de liste reste à définir.

**Traitement côté API**

1. Vérifier le scope soignant (`403` sinon).
2. Vérifier que le patient existe et que le soignant connecté le suit ; sinon `404`. Le consentement reste à valider.
3. Récupérer les seuils du patient.

---

## 11. Détail d'un seuil

### `GET /patients/{patientId}/seuils/{seuilId}`

Lire un seuil et obtenir son `ETag`, nécessaire à une modification conditionnelle.

**Appelant :** Soignant (scope soignant).

**Paramètres**

- `patientId` et `seuilId` : identifiants (chemin).
- `If-None-Match` : `ETag` déjà détenu (en-tête, facultatif).

**Données retournées**

Les six propriétés de `Threshold` et l'en-tête `ETag`.

**Traitement côté API**

1. Vérifier le scope soignant (`403` sinon).
2. Vérifier que le patient existe, que le soignant le suit et que le seuil lui appartient ; sinon `404`. Le consentement reste à valider.
3. Si `If-None-Match` correspond à l'`ETag` courant (comparaison faible) : `304` sans corps.
4. Sinon, retourner le seuil et son `ETag`.

---

## 12. Création d'un seuil

### `POST /patients/{patientId}/seuils`

Créer un seuil définissant les limites qui déclenchent des alertes pour les mesures d’un patient.

**Appelant :** Soignant (scope soignant).

**Paramètres**

- `patientId` : identifiant du patient (chemin).

**Données reçues**

- `typeMesure` : `FREQUENCE_CARDIAQUE`, `SPO2` ou `PAS`.
- `valeurMin` et `valeurMax` : nombres.

Les trois propriétés sont obligatoires, non nulles, sans propriété supplémentaire. Le patient vient du chemin ; le backend fixe automatiquement `actif` à `true`.

**Traitement côté API**

1. Vérifier le scope soignant (`403` sinon).
2. Vérifier que le patient existe et que le soignant connecté le suit ; sinon `404`. Le consentement reste à valider.
3. Valider les données et vérifier `valeurMin <= valeurMax`, égalité autorisée.
4. Vérifier qu'aucun seuil actif du même type n'existe déjà pour ce patient. Si c'est le cas, refuser la création (`409`) : un seul seuil actif est autorisé par patient et par type de mesure.
5. Enregistrer le nouveau seuil actif et retourner sa représentation `Threshold` avec les en-têtes `Location` (GET individuel) et `ETag`, selon le [guide des seuils](../openapi/thresholds/guide.md).

---

## 13. Modification d'un seuil

### `PATCH /patients/{patientId}/seuils/{seuilId}`

Adapter les bornes ou l’état d’un seuil pour ajuster la surveillance.

**Appelant :** Soignant (scope soignant).

**Paramètres**

- `patientId` : identifiant du patient (chemin).
- `seuilId` : identifiant du seuil (chemin).

**Données reçues**

- `valeurMin` : nombre (facultatif).
- `valeurMax` : nombre (facultatif).
- `actif` : booléen (facultatif).

Seuls les champs à modifier sont transmis, avec au moins un champ. Les corps vides, valeurs nulles et propriétés inconnues sont refusés ; le patient et le type de mesure ne sont pas modifiables.

- `If-Match` (en-tête) : `ETag` du seuil obtenu au dernier GET, POST ou PATCH ; exigé.

**Traitement côté API**

1. Vérifier le scope soignant (`403` sinon).
2. Vérifier que le patient existe, que le soignant connecté le suit et que le seuil appartient à ce patient ; sinon `404`, y compris pour un seuil d'un autre patient. Le consentement reste à valider.
3. `If-Match` absent : `428`. `If-Match` différent de l'`ETag` courant : `412`.
4. Valider les données et vérifier `valeurMin <= valeurMax` après combinaison avec les valeurs conservées.
5. Appliquer les modifications en respectant les règles suivantes :
   - Un seul seuil actif est autorisé par patient et par type de mesure.
   - L'activation est refusée si un autre seuil actif du même type existe déjà.
   - La désactivation conserve le seuil dans l'historique.

La réponse prévue contient `Threshold` et son `ETag`. Le [guide des seuils](../openapi/thresholds/guide.md#requêtes-conditionnelles-etag) décrit la transaction applicative à développer (`FOR UPDATE`) et l’index unique partiel déjà défini dans la migration. Le traitement HTTP et le calcul d’ETag restent à implémenter.

---

## 14. Autres endpoints

Les prochains endpoints seront ajoutés progressivement en conservant cette même organisation.
