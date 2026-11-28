# Conception de l’API REST — Veillo

Cette vue d’ensemble présente les parcours et les 13 opérations de Veillo. Les YAML sont la référence contractuelle ; les guides par domaine expliquent les JSON et les règles en détail.

- **Modèle et décisions :** [conception](design.md).
- **Statuts et en-têtes :** [revue HTTP](api-review.md).
- **Organisation des YAML :** [architecture OpenAPI](../openapi/architecture-api.md).
- **Génération et validation :** [outillage TP3](outillage-tp3.md).

Ces parcours décrivent la cible. Consulter le [backend](../backend/README.md) pour distinguer le code présent des fonctionnalités restant à développer.

## Contrats par domaine

- [Mesures : ingestion IoT et consultation](../openapi/measurements/measurements-contract.md).
- [Patients](../openapi/patients/patients-contract.md).
- [Alertes](../openapi/alerts/alerts-contract.md).
- [Consentements](../openapi/consents/consents-contract.md).
- [Seuils](../openapi/thresholds/thresholds-contract.md).
- [Cache HTTP des seuils](../openapi/cache/cache-contract.md).
- [Soignant : rôle interne, sans endpoint dédié en V1](../openapi/caregivers/caregivers-contract.md).

## Règles d’accès communes

Chaque type de client possède des scopes distincts : montre pour l’ingestion, patient pour ses consentements, soignant pour les consultations et la gestion de ses patients. Les noms définitifs et le rattachement des identités OAuth restent à valider.

Les collections ne retournent que les objets accessibles, quels que soient les filtres. Un filtre sur un patient hors périmètre donne une liste vide ; il ne donne aucun droit supplémentaire.

Le consentement doit être vérifié à chaque accès concerné. Le [périmètre encore ouvert](design.md#périmètre-du-contrôle-du-consentement) reste signalé dans les guides. Là où il est exigé, son absence exclut l’objet de la collection ou donne `404` en accès direct.

La [revue HTTP](api-review.md#règles-http-communes) précise la distinction entre `401`, `403` et `404`.

## 1. Ingestion des mesures

### `POST /measurements`

Le simulateur envoie un lot toutes les minutes pour un seul patient. `patientId`, `batchId` et `measurements` non vide sont obligatoires.

```text
émetteur authentifié → scope montre → patient autorisé
→ validation du lot → contrôle de batchId → enregistrement atomique
→ évaluation des seuils
```

Un relevé invalide fait rejeter tout le lot. Un `batchId` déjà enregistré donne `409`, même avec un contenu identique ; aucune nouvelle mesure n’est ajoutée.

Le [guide Mesures](../openapi/measurements/measurements-contract.md#1-envoyer-un-lot) contient le JSON complet et la signification des champs. Le rattachement de l’émetteur au patient, le stockage des lots et les garanties entre persistance et alertes restent à préciser dans la [conception](design.md#contrats-techniques).

## 2. Consultation des mesures

### `GET /patients/{patientId}/measurements`

Le soignant consulte une période de mesures pour un patient qu’il suit, avec un consentement valide. Le patient inexistant, non suivi ou sans consentement valide donne `404`.

Après les contrôles d’accès, l’API valide les filtres de période et de pagination, puis sélectionne les mesures. Le [guide Mesures](../openapi/measurements/measurements-contract.md#5-consulter-les-mesures-dun-patient) décrit les paramètres et la réponse encore ouverte.

## 3. Liste des patients

### `GET /patients`

Le soignant retrouve les patients liés par `SUIVRE`, avec leurs informations d’identité et une pagination. Le contrôle du consentement pour cette liste reste à valider.

Le [guide Patients](../openapi/patients/patients-contract.md#lister-ses-patients) précise les données attendues ; leur structure JSON n’est pas encore définie.

## 4. Détail d’un patient

### `GET /patients/{patientId}`

Le soignant consulte l’identité d’un patient suivi. Un patient inexistant ou non suivi donne `404`. Le consentement reste à harmoniser pour cette lecture.

Voir le [guide Patients](../openapi/patients/patients-contract.md#lire-un-patient) pour les informations attendues et les points ouverts.

## 5. Consultation des alertes

### `GET /alerts`

La liste couvre les alertes actives et traitées des patients suivis. Les filtres patient, statut et période ne peuvent jamais élargir ce périmètre.

Le [guide Alertes](../openapi/alerts/alerts-contract.md#lister-les-alertes) présente `AlertSummary`, les filtres et la pagination. L’enveloppe de liste et le contrôle du consentement restent ouverts.

## 6. Consultation du détail d’une alerte

### `GET /alerts/{alertId}`

Le soignant consulte `AlertDetail` pour un patient suivi, avec un consentement valide. Une alerte inexistante ou inaccessible donne `404`, sans distinguer les causes.

Voir le [JSON du détail](../openapi/alerts/alerts-contract.md#lire-une-alerte) et les interprétations encore proposées pour `valeurSeuil` et `horodatage`.

## Notifications des alertes

```text
dépassement → alerte ACTIVE → notification push générique
→ le soignant consulte GET /alerts/{alertId}
```

Message prévu : « Une nouvelle alerte nécessite votre attention. Connectez-vous à Veillo pour la consulter. »

Aucune donnée de santé, identité de patient ou valeur mesurée ne doit figurer dans la notification. La sélection des destinataires reste à définir.

Le sujet prévoit aussi un webhook signé. Son contrat et son articulation avec le push restent ouverts ; aucune livraison n’est implémentée.

## 7. Acquittement d’une alerte

### `PATCH /alerts/{alertId}`

Le soignant marque une alerte comme traitée avec `statut: TRAITEE`. L’alerte conserve son historique et ne peut pas être réactivée ; un nouvel appel sur une alerte déjà traitée donne `409`.

Le [guide Alertes](../openapi/alerts/alerts-contract.md#marquer-une-alerte-comme-traitée) décrit le corps et la réponse. Le PATCH retourne le même détail que le GET protégé, alors que son contrôle du consentement reste ouvert : cet [écart](design.md#périmètre-du-contrôle-du-consentement) doit être arbitré.

## 8. Consultation des consentements

### `GET /patients/me/consents`

Le patient connecté consulte ses propres consentements. `me` vient de son identité authentifiée : aucun identifiant de patient n’est fourni en paramètre.

Le [guide Consentements](../openapi/consents/consents-contract.md#consulter-ses-consentements) précise les informations attendues et les décisions JSON restantes.

## 9. Retrait du consentement

### `DELETE /patients/me/consents/{consentId}`

Le patient retire une autorisation qui lui appartient. L’API conserve le consentement et la trace du retrait, puis bloque les accès futurs concernés sans supprimer les mesures ni leur historique.

Voir le [parcours de retrait](../openapi/consents/consents-contract.md#retirer-un-consentement). Un consentement inexistant ou appartenant à autrui donne `404` ; le comportement d’un retrait répété reste à valider.

## 10. Consultation des seuils

### `GET /patients/{patientId}/seuils`

Le soignant consulte les seuils actifs et inactifs du patient suivi. Chaque élément suit `Threshold` ; l’enveloppe de liste reste à définir. Cette collection n’a pas d’ETag.

Voir le [guide Seuils](../openapi/thresholds/thresholds-contract.md#lister-les-seuils).

## 11. Détail d’un seuil

### `GET /patients/{patientId}/seuils/{seuilId}`

Le soignant lit un seuil appartenant au patient suivi et obtient son ETag. Après les contrôles d’accès, un `If-None-Match` correspondant donne `304` sans corps ; sinon, `200` renvoie le seuil.

Le [guide Seuils](../openapi/thresholds/thresholds-contract.md#lire-un-seuil) décrit le JSON. Le [contrat du cache](../openapi/cache/cache-contract.md) explique les comparaisons et les en-têtes.

## 12. Création d’un seuil

### `POST /patients/{patientId}/seuils`

Le soignant crée un seuil pour le patient de l’URL. Le backend l’active automatiquement et refuse la création si un seuil actif du même type existe déjà.

Le [guide Seuils](../openapi/thresholds/thresholds-contract.md#créer-un-seuil) présente les trois champs obligatoires et la validation des bornes. Le `201` renvoie `Threshold`, `Location` vers le GET individuel et l’ETag.

## 13. Modification d’un seuil

### `PATCH /patients/{patientId}/seuils/{seuilId}`

Le soignant transmet les bornes ou l’état à modifier, avec au moins un champ et `If-Match`. Le patient et le type de mesure ne sont pas modifiables.

L’API vérifie les accès, puis les préconditions, avant le contenu et les conflits métier. Elle valide les bornes après combinaison avec les valeurs conservées et maintient l’unicité du seuil actif. Désactiver conserve le seuil.

Le [guide Seuils](../openapi/thresholds/thresholds-contract.md#modifier-un-seuil) contient les exemples et la [transaction prévue](../openapi/thresholds/thresholds-contract.md#requêtes-conditionnelles-etag). Le consentement reste à valider pour les quatre opérations Seuils.
