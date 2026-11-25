# Conception — Veillo, télésuivi de patients

## 1. Présentation de l’architecture

Veillo simule le télésuivi hospitalier de patients à domicile. Les données sont fictives ; le simulateur transmettra les mesures à l’API NestJS/TypeScript, qui les stockera dans PostgreSQL et gérera seuils, alertes et accès autorisés.

Ce document décrit le modèle et les décisions, pas un backend métier terminé. Le [README](../README.md) présente l’état réel et les commandes. Une application mobile externe pourra appeler l’API ; **aucun frontend n’est à développer par l’équipe.**

## 2. Responsabilités des composants

- **Simulateur IoT :** simuler des montres connectées, produire des mesures fictives et les transmettre par lots toutes les minutes. Il n’accédera pas directement à la base. Sa technologie et son organisation interne restent à définir.
- **API REST NestJS/TypeScript :** recevoir et valider les données, appliquer les règles métier et la sécurité, gérer la persistance et exposer les opérations HTTP.
- **PostgreSQL :** conserver patients, soignants, mesures, seuils, alertes et consentements. La connexion TypeORM est configurée et le SQL de Patients, Seuils et Consentements existe dans les migrations. Les autres tables, les Entities actives et la persistance applicative restent à développer. Voir les [choix techniques](../CHOIX_TECHNIQUES.md).
- **Application mobile externe :** appeler l’API en tant que client, sans faire partie des composants développés par l’équipe.

## 3. Échanges prévus

Le simulateur et le client mobile communiqueront avec l’API en **HTTP/JSON**. Le simulateur enverra les lots ; le client mobile utilisera les opérations de consultation et de gestion selon ses droits.

`Simulateur → HTTP/JSON → API → PostgreSQL`.

Le client mobile utilise aussi HTTP/JSON. L’accès PostgreSQL reste interne au backend.

La documentation API est répartie entre deux documents :

- [api.md](api.md) : endpoints, méthodes HTTP, données échangées, traitements et règles métier.
- [api-review.md](api-review.md) : réponses HTTP de chaque endpoint, situations de succès ou d’erreur et points à valider.

Les requêtes Bruno du TP1 explorent httpbin et HAPI FHIR. Elles ne constituent pas le contrat de Veillo et n’imposent pas FHIR comme format métier.

## 4. Modélisation des données

Le MCD, réalisé avec Mocodo, comporte **6 entités et 8 associations**. Aucune association ne possède d’attribut.

- [MCD : entités et associations métier](images/Modele%20Conceptuel%20de%20Donn%C3%A9e%20MCD-veillo.png).
- [MLD : tables et relations](images/Sch%C3%A9ma%20relationnel%20MLD%20%E2%80%94%20Veillo.png).
- [MPD : colonnes et types PostgreSQL](images/Sch%C3%A9ma%20MPD%20relationnel%20Veillo.png).

Ces modèles décrivent la conception. L’existence des tables sur un poste se vérifie dans PostgreSQL et dans l’historique des migrations.

### Diagramme de classes Mermaid

Ce diagramme est une représentation UML du modèle conceptuel, et non un schéma physique PostgreSQL.

```mermaid
classDiagram
    class PATIENT {
        +id_patient
        +nom
        +prenom
        +date_naissance
    }

    class SOIGNANT {
        +id_soignant
        +nom
        +prenom
        +specialite
        +email
    }

    class CONSENTEMENT {
        +id_consentement
        +date_debut
        +date_fin
    }

    class MESURE {
        +id_mesure
        +horodatage
        +frequence_cardiaque
        +spo2
        +pas
    }

    class SEUIL {
        +id_seuil
        +type_mesure
        +valeur_min
        +valeur_max
        +actif
    }

    class ALERTE {
        +id_alerte
        +horodatage
        +valeur_seuil
        +statut
    }

    PATIENT "1" -- "0..*" CONSENTEMENT : DONNER
    SOIGNANT "1" -- "0..*" CONSENTEMENT : CONCERNER
    PATIENT "0..*" -- "0..*" SOIGNANT : SUIVRE
    PATIENT "1" -- "0..*" MESURE : POSSEDER
    PATIENT "1" -- "0..*" SEUIL : AVOIR_SEUIL
    MESURE "1" -- "0..*" ALERTE : DECLENCHER
    SEUIL "1" -- "0..*" ALERTE : PROVOQUER
    SOIGNANT "0..*" -- "0..*" ALERTE : RECEVOIR
```

### Le modèle Mocodo

Ce code permet de reproduire le MCD dans Mocodo.

```text mocobo
%% Veillo - MCD (sujet 6 : telesuivi patient)

CONSENTEMENT: id_consentement, date_debut, date_fin
DONNER, 0N PATIENT, 11 CONSENTEMENT
PATIENT: id_patient, nom, prenom, date_naissance
AVOIR_SEUIL, 0N PATIENT, 11 SEUIL
SEUIL: id_seuil, type_mesure, valeur_min, valeur_max, actif

CONCERNER, 0N SOIGNANT, 11 CONSENTEMENT
SUIVRE, 0N PATIENT, 0N SOIGNANT
POSSEDER, 0N PATIENT, 11 MESURE
:
PROVOQUER, 0N SEUIL, 11 ALERTE

SOIGNANT: id_soignant, nom, prenom, specialite, email
:
MESURE: id_mesure, horodatage, frequence_cardiaque, spo2, pas
DECLENCHER, 0N MESURE, 11 ALERTE
ALERTE: id_alerte, horodatage, valeur_seuil, statut

:
RECEVOIR, 0N SOIGNANT, 0N ALERTE
:
```

### Choix de conception retenus

- **Suivi :** plusieurs soignants par patient et inversement. Aucun historique des suivis, car les fonctionnalités demandées n’en ont pas besoin ; seul le suivi actuel est représenté.
- **Mesures :** une mesure appartient à un patient et regroupe fréquence cardiaque, SpO₂, nombre de pas et horodatage. Elle peut dépasser plusieurs seuils.
- **Seuils :** un minimum et un maximum par patient et type de mesure pour repérer les valeurs anormales. Un seul seuil actif est autorisé pour un même patient et un même type de mesure ; un seuil désactivé est conservé.
- **Alertes :** chaque alerte est liée à une mesure et à un seuil. Pour garder le modèle simple, aucune date d’envoi ou de lecture n’est conservée. `RECEVOIR` autorise zéro à plusieurs destinataires ; le minimum attendu reste à confirmer.
- **Consentement :** il relie un patient et un soignant. `date_debut` marque le début de validité ; `date_fin` indique la fin ou le retrait. Le consentement retiré et la trace de son retrait sont conservés, sans supprimer l’historique des données. Cela ne définit pas un historique complet des renouvellements et retraits successifs.

## 5. Modèle de ressources REST

```mermaid
flowchart TD
    %% Veillo : modèle de ressources REST, établi à partir des 13 endpoints de docs/api.md
    %% Trait plein : hiérarchie d'URI (sous-ressource réellement définie)
    %% Pointillés : référence métier ou information associée retournée par l'API

    SOI(["<b>Soignant</b><br/>appelant authentifié<br/>aucune URI exposée"])
    PAT["<b>Patients</b><br/>/patients<br/>/patients/{patientId}"]
    ALE["<b>Alertes</b><br/>/alerts<br/>/alerts/{alertId}"]
    CON["<b>Consentements</b><br/>/patients/me/consents<br/>/patients/me/consents/{consentId}"]
    MES["<b>Mesures</b><br/>/patients/{patientId}/measurements<br/><i>+ /measurements (ingestion)</i>"]
    SEU["<b>Seuils</b><br/>/patients/{patientId}/seuils<br/>/patients/{patientId}/seuils/{seuilId}"]

    %% Hiérarchie des URI
    PAT -->|"sous-ressource<br/>(me = patient connecté)"| CON
    PAT -->|"sous-ressource"| MES
    PAT -->|"sous-ressource"| SEU

    %% Références métier et informations associées
    SOI -.->|"suit (SUIVRE)<br/>filtre /patients et /alerts"| PAT
    SOI -.->|"RECEVOIR (MCD)<br/>sans URI, destinataires à définir"| ALE
    ALE -.->|"patientId<br/>retourné et filtrable"| PAT
    ALE -.->|"valeur mesurée<br/>retournée, sans id"| MES
    ALE -.->|"valeur du seuil<br/>retournée, sans id"| SEU
    CON -.->|"id du soignant<br/>concerné retourné"| SOI

    %% Légende
    subgraph LEG["Légende"]
        direction LR
        L1[" "] -->|"hiérarchie d'URI"| L2[" "]
        L3[" "] -.->|"référence ou info retournée"| L4[" "]
    end

    classDef ressource fill:#eef4ff,stroke:#3b6fd8,stroke-width:1.5px,color:#13284f
    classDef implicite fill:#f5f5f5,stroke:#888,stroke-width:1px,stroke-dasharray:4 3,color:#333
    classDef point fill:none,stroke:none,color:transparent
    class PAT,MES,SEU,CON,ALE ressource
    class SOI implicite
    class L1,L2,L3,L4 point
```

## 6. Règles métier

L’API devra appliquer les règles suivantes, que le MCD ne suffit pas à exprimer :

- **Mesures :** recevoir les lots du simulateur et associer chaque mesure au patient concerné. Une mesure regroupe fréquence cardiaque, SpO₂, nombre de pas et horodatage.
- **Seuils :** comparer les mesures aux seuils applicables du même patient. Un seul seuil actif est autorisé par patient et type de mesure. La création ou l’activation est refusée si un autre seuil actif du même type existe déjà ; la désactivation conserve le seuil.
- **Alertes :** créer une alerte `ACTIVE` lorsqu’une mesure dépasse un seuil applicable. L’alerte est liée à cette mesure et à ce seuil, qui doivent appartenir au même patient. Une mesure peut déclencher plusieurs alertes. Le soignant peut passer le statut à `TRAITEE` ; une alerte traitée reste dans l’historique et ne peut pas être réactivée.
- **Destinataires :** prévenir les soignants concernés par notification push, avec un message générique sans donnée de santé, selon [api.md](api.md#notifications-des-alertes). Les critères de sélection des destinataires restent à préciser.
- **Consentement :** relier un patient et un soignant et vérifier sa validité lors des consultations concernées. Son retrait empêche immédiatement les accès concernés.
- **Accès aux mesures :** un soignant doit posséder les droits nécessaires, suivre le patient et disposer d’un consentement valide de ce patient.

## 7. Sécurité

**Choix retenu : OAuth 2.0 avec des jetons d’accès JWT.** Les scopes seront distincts pour les montres, les patients et les soignants.

Trois notions se complètent :

- **Authentification :** identifier l’appelant.
- **Autorisation :** vérifier ses permissions et ses droits sur les ressources demandées. Un scope précise les actions autorisées, pas les patients concernés.
- **Consentement :** autorisation donnée par un patient à un soignant pour accéder à ses données.

Le backend devra vérifier la signature et la validité des JWT, leurs informations d’autorisation et les droits sur les ressources. Il contrôlera le consentement à chaque accès concerné.

Codes d’accès retenus, selon les exigences du formateur :

- `401` : authentification absente ou invalide.
- `403` : appelant authentifié dont le rôle ou le scope est insuffisant (BFLA). Les clients montre, patient et soignant ont des scopes distincts.
- `404` : objet inexistant ou hors du périmètre autorisé (BOLA), en lecture comme en écriture. Un soignant n’accède qu’à ses patients (`SUIVRE`) et un patient qu’à ses consentements.
- Les collections ne retournent que les objets accessibles, quels que soient les filtres.

Les réponses seront limitées aux données nécessaires. Aucune donnée de santé sensible ne devra figurer dans les logs, y compris dans les messages d’erreur.

Pour le mobile, **Authorization Code avec PKCE reste une option recommandée à étudier**. Fournisseur, flux, noms des scopes et lien OAuth–entités métier restent à valider.

## 8. Décisions restant à clarifier

Les points suivants restent ouverts ; ils ne constituent pas des décisions validées.

### Consentements

- Préciser les conditions de validité des dates et la possibilité d’un consentement sans `date_fin`.
- Déterminer si un patient peut renouveler un consentement après son retrait ou en avoir plusieurs pour un même soignant.

### Périmètre du contrôle du consentement

La comparaison des contrats fait apparaître les situations suivantes :

- **Contrôle explicite :** `GET /patients/{patientId}/measurements` et `GET /alerts/{alertId}` vérifient le consentement valide, en plus du suivi et des autorisations.
- **Contrôle non précisé :** les listes et détails des patients, la liste des alertes et les deux GET des seuils laissent encore ce contrôle ouvert.
- **Consentements du patient connecté :** `GET /patients/me/consents` repose sur son authentification pour retrouver ses propres consentements, sans contrôle d’un consentement accordé à un soignant.
- **Actions du soignant :** le consentement n’est pas explicité pour `PATCH /alerts/{alertId}` ni pour la création et la modification des seuils. Son application à ces actions reste à décider.

Là où il est exigé : absence ou retrait → `404` en accès direct, exclusion d’une collection.

**Écart à arbitrer :** le sujet exige le consentement à chaque accès concerné, mais plusieurs contrats le laissent conditionnel. Le PATCH d’alerte retourne notamment le même détail que le GET protégé. Ces passages ne constituent pas une autorisation d’accès sans consentement ; les contrats restent à harmoniser, sans modifier leurs droits ici.

### Seuils

- **Requêtes conditionnelles retenues :** `GET` individuel du seuil avec `ETag`, `If-Match` obligatoire sur le `PATCH` (`412`, `428`) et `If-None-Match` avec `304`. L’`ETag` est un validateur fort calculé depuis la représentation, sans colonne de version.

Le PATCH devra vérifier puis modifier le seuil dans une transaction avec `SELECT … FOR UPDATE`, pour empêcher une écriture concurrente pendant ce contrôle. L’index unique partiel, limité aux seuils actifs, est déjà défini dans la migration Seuils. Le calcul d’ETag et le traitement HTTP restent à implémenter : voir le [guide des seuils](../openapi/thresholds/guide.md#requêtes-conditionnelles-etag).

- Confirmer si un dépassement correspond à une valeur hors de l’intervalle `valeur_min`–`valeur_max`.
- Préciser les modalités d’application de `actif` lors de l’évaluation des mesures. L’unicité du seuil actif est retenue ; la possibilité de conserver plusieurs seuils inactifs pour un même patient et un même type reste à préciser.

### Alertes

- Choisir les destinataires : tous les soignants qui suivent le patient, ou seulement ceux ayant un consentement valide ?
- Confirmer si une alerte peut n’avoir aucun destinataire : `RECEVOIR` l’autorise, alors que le texte initial prévoyait « un ou plusieurs » soignants.
- Préciser le contenu de `valeur_seuil`. Les statuts `ACTIVE` et `TRAITEE`, ainsi que la transition sans réactivation, sont définis dans [api.md](api.md).
- **Acquittement individuel : incohérence à résoudre.** L’API décrit actuellement une mise à jour du statut commun de l’alerte. Un acquittement propre à chaque soignant avait aussi été envisagé, mais `statut` appartient à `ALERTE` et `RECEVOIR` n’a aucun attribut. Ce besoin individuel reste à trancher ; aucune solution ni modification du MCD n’est décidée ici.

### Contrats techniques

Les contrats documentés sont regroupés dans [api.md](api.md) (endpoints, lots et notifications) et [api-review.md](api-review.md) (réponses HTTP et cas à valider). Les points suivants restent à préciser :

- Le patient d’un lot est ciblé par `patientId`, selon le [contrat Mesures](../openapi/measurements/guide.md). L’identification de l’émetteur et son autorisation sur ce patient restent à définir, avec les modalités de sécurité de la section 7. Le MCD ne contient pas d’entité dédiée aux comptes.
- L’ordre et les garanties entre stockage des mesures, évaluation des seuils et création des alertes.
- Compléter la traduction du modèle en Entities et migrations PostgreSQL. Le SQL Patients, Seuils et Consentements est préparé ; cela ne finalise pas les autres ressources ni les traitements applicatifs.
- Le webhook signé prévu par le sujet : contrat, destinataire et articulation avec le push restent à définir. Aucune livraison n’est implémentée.
