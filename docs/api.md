# Conception de l'API REST — Veillo

Ce document présente les endpoints de l'API Veillo, leur rôle et leur fonctionnement. Les choix sont définis progressivement avec l'équipe.

Les réponses HTTP sont regroupées dans la [revue des réponses HTTP](api-review.md).

L’[organisation du contrat OpenAPI et les commandes de validation](outillage-tp3.md#1-organisation-du-contrat-openapi) sont décrites dans le guide d’outillage du TP3.

## Contrats par domaine

Les guides suivants regroupent les routes, les JSON définis, les réponses prévues et les points ouverts utiles à chaque domaine :

- [Mesures : ingestion IoT et consultation](contrats/mesures.md).
- [Patients](contrats/patients.md).
- [Alertes](contrats/alertes.md).
- [Consentements](contrats/consentements.md).
- [Seuils](contrats/seuils.md), dont ETag et requêtes conditionnelles.
- [Cache HTTP et requêtes conditionnelles](contrats/cache.md), limité aux seuils.

## Règles d’accès communes

- `401` : authentification absente ou invalide.
- `403` : appelant authentifié dont le rôle ou le scope est insuffisant (BFLA). Les trois types de clients ont des scopes distincts : **montre** pour l’ingestion, **patient** pour les consentements, **soignant** pour les patients, mesures, alertes et seuils. Les noms exacts sont provisoires.
- `404` : objet inexistant ou hors du périmètre autorisé de l’appelant (BOLA), en lecture comme en écriture. Un soignant n’accède qu’à ses patients ; un patient non suivi, un seuil d’un autre patient ou le consentement d’un autre patient sont traités comme inexistants.
- Les collections ne retournent que les objets accessibles, quels que soient les filtres transmis (liste vide en `200` pour un filtre hors périmètre).
- Le consentement du patient est vérifié à chaque accès concerné ; son périmètre par opération reste à valider. Là où il est exigé, son absence ou son retrait donne `404`.

---

## 1. Ingestion des mesures

### `POST /measurements`

**Objectif**

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

Les trois champs du lot et les quatre champs de chaque relevé sont obligatoires. Le type et le format des identifiants, les unités et les bornes numériques restent à préciser.

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

Les identifiants de cet exemple n’imposent ni préfixe ni format définitif. Chaque nouveau lot utilise un nouveau `batchId` ; renvoyer un lot déjà enregistré entraîne un conflit.

**Traitement côté API**

1. Identifier l’émetteur authentifié (`401` sinon), vérifier son scope montre (`403` sinon), puis que le `patientId` indiqué existe et lui est rattaché (`404` sinon) ; rattacher toutes les mesures à ce patient. Les modalités d’identification et de rattachement restent à définir.
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

**Appelant :** Soignant (scope soignant).

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

1. Vérifier le scope soignant (`403` sinon).
2. Vérifier que le patient existe, que le soignant le suit et que le consentement est valide ; sinon `404`.
3. Valider les paramètres de période et de pagination.
4. Récupérer les mesures correspondant aux critères demandés.

---

## 3. Liste des patients

### `GET /patients`

**Objectif**

Afficher les patients suivis par le soignant connecté.

**Appelant :** Soignant (scope soignant).

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

1. Identifier le soignant connecté et vérifier son scope (`403` sinon).
2. Récupérer uniquement les patients qu'il suit via l'association `SUIVRE`, que le consentement soit retenu ou non à ce niveau (à valider).
3. Appliquer la pagination.

---

## 4. Détail d'un patient

### `GET /patients/{patientId}`

**Objectif**

Consulter les informations d’un patient suivi.

**Appelant :** Soignant (scope soignant).

**Paramètres**

- `patientId` : identifiant du patient (paramètre de chemin).

**Données retournées**

- Identifiant du patient.
- Nom.
- Prénom.
- Date de naissance.

**Traitement côté API**

1. Vérifier le scope soignant (`403` sinon).
2. Vérifier que le patient existe et que le soignant connecté le suit ; sinon `404`.
3. Retourner les informations du patient.

---

## 5. Consultation des alertes

### `GET /alerts`

**Objectif**

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

- Identifiant de l'alerte.
- Identifiant du patient.
- Nom et prénom du patient.
- Type de mesure.
- Date et heure.
- Statut de l'alerte.

**Traitement côté API**

1. Identifier le soignant connecté et vérifier son scope (`403` sinon).
2. Récupérer les alertes concernant uniquement les patients qu'il suit.
3. Appliquer les filtres éventuels sans jamais élargir ce périmètre (un filtre `patientId` hors périmètre donne une liste vide).
4. Appliquer la pagination.
5. Retourner les alertes correspondantes.

---

## 6. Consultation du détail d'une alerte

### `GET /alerts/{alertId}`

**Objectif**

Consulter les détails d’une alerte pour identifier le patient concerné et la mesure qui l’a déclenchée.

**Appelant :** Soignant (scope soignant).

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

1. Identifier le soignant connecté et vérifier son scope (`403` sinon).
2. Vérifier que l'alerte existe, que le soignant suit le patient concerné et que le consentement est valide ; sinon `404`.
3. Retourner les détails de l'alerte.

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

- Une alerte est créée automatiquement avec le statut `ACTIVE`.
- Le soignant peut la faire passer à `TRAITEE`.
- Une alerte traitée ne peut pas être réactivée.
- Les alertes traitées sont conservées dans l'historique.

---

## 8. Consultation des consentements

### `GET /patients/me/consents`

**Objectif**

Consulter les consentements donnés par le patient connecté.

**Appelant :** Patient authentifié (scope patient).

**Paramètres**

Aucun.

**Données retournées**

- Identifiant du consentement.
- Identifiant du soignant concerné.
- Date de début.
- Date de fin, si renseignée.
- État du consentement.

**Traitement côté API**

1. Identifier le patient connecté à partir de son authentification et vérifier son scope (`403` sinon).
2. Récupérer ses consentements.
3. Retourner les informations correspondantes.

---

## 9. Retrait du consentement

### `DELETE /patients/me/consents/{consentId}`

**Objectif**

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

**Objectif**

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

**Objectif**

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

**Objectif**

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
5. Enregistrer le nouveau seuil actif et retourner sa représentation `Threshold` avec les en-têtes `Location` (GET individuel) et `ETag`, selon le [guide des seuils](contrats/seuils.md).

---

## 13. Modification d'un seuil

### `PATCH /patients/{patientId}/seuils/{seuilId}`

**Objectif**

Adapter les valeurs d’un seuil ou l’activer ou le désactiver pour ajuster la surveillance du patient.

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

La réponse contient la représentation `Threshold` après modification et son nouvel `ETag`, selon le [guide des seuils](contrats/seuils.md). L'ordre des contrôles et le futur mécanisme transactionnel (`FOR UPDATE`, index unique partiel) sont décrits dans ce guide ; ils ne sont pas implémentés.

---

## 14. Autres endpoints

Les prochains endpoints seront ajoutés progressivement en conservant cette même organisation.
