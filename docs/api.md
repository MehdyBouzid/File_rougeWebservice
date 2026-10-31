# Conception de l'API REST — Veillo

Ce document présente les endpoints de l'API Veillo, leur rôle et leur fonctionnement. Les choix sont définis progressivement avec l'équipe.

Les réponses HTTP sont regroupées dans la [revue des réponses HTTP](api-review.md).

---

## 1. Ingestion des mesures

### `POST /measurements`

**Objectif**

Enregistrer les mesures envoyées par les montres connectées pour assurer le suivi des patients.

**Appelant :** Simulateur IoT.

**Données reçues**

- `batchId` : identifiant unique du lot.
- `measurements` : liste des relevés contenant :
  - Horodatage.
  - Fréquence cardiaque.
  - SpO₂.
  - Nombre de pas.

Le format JSON exact et les règles de validation restent à définir.

**Traitement côté API**

1. Identifier la montre émettrice et rattacher les mesures au patient concerné ; les modalités restent à définir.
2. Vérifier les données reçues. Une seule mesure invalide entraîne le rejet du lot entier.
3. Vérifier le `batchId`, qui identifie de manière unique le lot :
   - S’il n’existe pas, poursuivre l’enregistrement du lot.
   - S’il est déjà enregistré avec un contenu identique, rejeter la requête sans enregistrer de nouvelles mesures.
   - S’il est déjà enregistré avec un contenu différent, rejeter également la requête sans enregistrer de nouvelles mesures.
4. Enregistrer le lot et toutes ses mesures dans PostgreSQL, au sein d’une transaction : toutes les mesures sont enregistrées ou aucune ne l’est. La structure de stockage des lots reste à définir.
5. Vérifier les seuils applicables.

---

## 2. Consultation des mesures

### `GET /patients/{patientId}/measurements`

**Objectif**

Récupérer les mesures d’un patient sur une période donnée pour suivre leur évolution.

**Appelant :** Soignant autorisé.

**Paramètres**

- `patientId` : identifiant du patient (chemin).
- `startDate` : début de la période (requête).
- `endDate` : fin de la période (requête).
- `page` : numéro de page, à partir de 0 (défaut : `0`).
- `size` : nombre de mesures par page (défaut : `50`, maximum : `100`).

**Données retournées**

- Horodatage.
- Fréquence cardiaque.
- SpO₂.
- Nombre de pas.
- Page actuelle, taille de page et nombre total de pages.

**Traitement côté API**

1. Vérifier l'existence du patient.
2. Vérifier que le soignant suit ce patient.
3. Vérifier ses autorisations et le consentement.
4. Valider les paramètres de période et de pagination.
5. Récupérer les mesures correspondant aux critères demandés.

---

## 3. Liste des patients

### `GET /patients`

**Objectif**

Afficher les patients suivis par le soignant connecté.

**Appelant :** Soignant autorisé.

**Paramètres**

- `page` : numéro de page, à partir de 0 (défaut : `0`).
- `size` : nombre de patients par page (défaut : `50`, maximum : `100`).

**Données retournées**

- Identifiant du patient.
- Nom.
- Prénom.
- Date de naissance.
- Informations de pagination.

**Traitement côté API**

1. Identifier le soignant connecté.
2. Récupérer uniquement les patients qu'il suit via l'association `SUIVRE`.
3. Appliquer la pagination.

---

## 4. Détail d'un patient

### `GET /patients/{patientId}`

**Objectif**

Consulter les informations d’un patient suivi.

**Appelant :** Soignant autorisé.

**Paramètres**

- `patientId` : identifiant du patient (paramètre de chemin).

**Données retournées**

- Identifiant du patient.
- Nom.
- Prénom.
- Date de naissance.

**Traitement côté API**

1. Vérifier l'existence du patient.
2. Vérifier que le soignant connecté suit ce patient.
3. Vérifier ses autorisations.
4. Retourner les informations du patient.

---

## 5. Consultation des alertes

### `GET /alerts`

**Objectif**

Afficher les alertes des patients suivis, qu’elles soient actives ou déjà traitées.

**Appelant :** Soignant autorisé.

**Paramètres**

- `patientId` : filtrer par patient (facultatif).
- `status` : filtrer par statut (facultatif).
- `startDate` : début de la période (facultatif).
- `endDate` : fin de la période (facultatif).
- `page` : numéro de page, à partir de 0 (défaut : `0`).
- `size` : nombre d'alertes par page (défaut : `50`, maximum : `100`).

**Données retournées**

- Identifiant de l'alerte.
- Identifiant du patient.
- Nom et prénom du patient.
- Type de mesure.
- Date et heure.
- Statut de l'alerte.

**Traitement côté API**

1. Identifier le soignant connecté.
2. Récupérer les alertes concernant uniquement les patients qu'il suit.
3. Appliquer les filtres éventuels.
4. Appliquer la pagination.
5. Retourner les alertes correspondantes.

---

## 6. Consultation du détail d'une alerte

### `GET /alerts/{alertId}`

**Objectif**

Consulter les détails d’une alerte pour identifier le patient concerné et la mesure qui l’a déclenchée.

**Appelant :** Soignant autorisé.

**Paramètres**

- `alertId` : identifiant de l'alerte (chemin).

**Données retournées**

- Identifiant de l'alerte.
- Identifiant du patient.
- Type de mesure.
- Valeur mesurée.
- Valeur du seuil déclenché.
- Date et heure.
- Statut de l'alerte.

**Traitement côté API**

1. Identifier le soignant connecté.
2. Vérifier l'existence de l'alerte.
3. Vérifier que le soignant suit le patient concerné.
4. Vérifier ses autorisations et le consentement.
5. Retourner les détails de l'alerte.

---

## Notifications des alertes

**Objectif**

Informer le soignant lorsqu’une nouvelle alerte est créée pour l’un de ses patients.

**Déclenchement**

1. Le backend détecte un dépassement de seuil.
2. Il crée une alerte avec le statut `ACTIVE`.
3. Il déclenche une notification push au soignant concerné.

**Contenu**

Message générique : « Une nouvelle alerte nécessite votre attention. Connectez-vous à Veillo pour la consulter. »

Aucune donnée de santé ne doit apparaître dans la notification (patient, mesure ou valeur).

**Consultation**

Le soignant sélectionne une notification et consulte dans l’application les détails de l’alerte correspondante via `GET /alerts/{alertId}`.

---

## 7. Acquittement d'une alerte

### `PATCH /alerts/{alertId}`

**Objectif**

Marquer une alerte comme traitée après sa prise en charge par le soignant.

**Appelant :** Soignant autorisé.

**Paramètres**

- `alertId` : identifiant de l'alerte (chemin).

**Données reçues**

- `statut` : nouveau statut, avec la valeur `TRAITEE`.

**Traitement côté API**

1. Identifier le soignant connecté.
2. Vérifier l'existence de l'alerte.
3. Vérifier que le soignant suit le patient concerné.
4. Vérifier que l'alerte n'a pas déjà été traitée.
5. Mettre à jour le statut de l'alerte.

**Règles métier**

- Une alerte est créée automatiquement avec le statut `ACTIVE`.
- Le soignant peut la faire passer à `TRAITEE`.
- Une alerte traitée ne peut pas être réactivée.
- Les alertes traitées sont conservées dans l'historique.

---

## 8. Consultation des consentements

### `GET /patients/me/consents`

**Objectif**

Consulter les consentements donnés par le patient connecté.

**Appelant :** Patient authentifié.

**Paramètres**

Aucun.

**Données retournées**

- Identifiant du consentement.
- Identifiant du soignant concerné.
- Date de début.
- Date de fin, si renseignée.
- État du consentement.

**Traitement côté API**

1. Identifier le patient connecté à partir de son authentification.
2. Récupérer ses consentements.
3. Retourner les informations correspondantes.

---

## 9. Retrait du consentement

### `DELETE /patients/me/consents/{consentId}`

**Objectif**

Retirer un consentement précédemment donné pour mettre fin aux accès concernés.

**Appelant :** Patient authentifié.

**Paramètres**

- `consentId` : identifiant du consentement à retirer.

**Traitement côté API**

1. Identifier le patient connecté.
2. Vérifier que le consentement existe et lui appartient.
3. Enregistrer le retrait en conservant la trace du consentement et de son retrait.
4. Empêcher les accès futurs aux données concernés par ce consentement.

Le retrait ne supprime ni le consentement ni l’historique des données.

---

## 10. Consultation des seuils

### `GET /patients/{patientId}/seuils`

**Objectif**

Consulter les seuils configurés pour surveiller les mesures d’un patient.

**Appelant :** Soignant autorisé.

**Paramètres**

- `patientId` : identifiant du patient (chemin).

**Données retournées**

- Identifiant du seuil.
- Type de mesure.
- Valeur minimale.
- Valeur maximale.
- État (actif ou désactivé).

**Traitement côté API**

1. Vérifier l'existence du patient.
2. Vérifier que le soignant connecté suit ce patient.
3. Vérifier ses autorisations.
4. Récupérer les seuils du patient.

---

## 11. Création d'un seuil

### `POST /patients/{patientId}/seuils`

**Objectif**

Créer un seuil définissant les limites qui déclenchent des alertes pour les mesures d’un patient.

**Appelant :** Soignant autorisé.

**Paramètres**

- `patientId` : identifiant du patient (chemin).

**Données reçues**

- Type de mesure.
- Valeur minimale.
- Valeur maximale.

**Traitement côté API**

1. Vérifier l'existence du patient.
2. Vérifier que le soignant connecté suit ce patient.
3. Vérifier ses autorisations.
4. Valider les valeurs du seuil.
5. Vérifier qu'aucun seuil actif du même type n'existe déjà pour ce patient. Si c'est le cas, refuser la création : un seul seuil actif est autorisé par patient et par type de mesure.
6. Enregistrer le nouveau seuil.

---

## 12. Modification d'un seuil

### `PATCH /patients/{patientId}/seuils/{seuilId}`

**Objectif**

Adapter les valeurs d’un seuil ou l’activer ou le désactiver pour ajuster la surveillance du patient.

**Appelant :** Soignant autorisé.

**Paramètres**

- `patientId` : identifiant du patient (chemin).
- `seuilId` : identifiant du seuil (chemin).

**Données reçues**

- Valeur minimale (facultative).
- Valeur maximale (facultative).
- État actif ou désactivé (facultatif).

Seuls les champs à modifier sont transmis.

**Traitement côté API**

1. Vérifier l'existence du patient.
2. Vérifier que le soignant connecté suit ce patient.
3. Vérifier que le seuil appartient au patient.
4. Vérifier ses autorisations.
5. Valider les nouvelles valeurs.
6. Appliquer les modifications en respectant les règles suivantes :
   - Un seul seuil actif est autorisé par patient et par type de mesure.
   - L'activation est refusée si un autre seuil actif du même type existe déjà.
   - La désactivation conserve le seuil dans l'historique.

---

## 13. Autres endpoints

Les prochains endpoints seront ajoutés progressivement en conservant cette même organisation.
