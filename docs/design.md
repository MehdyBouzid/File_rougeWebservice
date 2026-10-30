# Conception — Veillo, télésuivi de patients

Projet M2 Web Services, sujet 6.

## 1. Contexte et objectifs

Veillo suit à distance des patients équipés de montres connectées. Les montres envoient des mesures à une API : fréquence cardiaque, saturation en oxygène (SpO₂) et nombre de pas, par lots toutes les minutes. Quand une mesure dépasse un seuil, une alerte est créée et des soignants sont prévenus. Les soignants peuvent consulter les mesures des patients qu'ils suivent, si le patient les y a autorisés.

Les montres sont simulées et toutes les données sont fictives.

Ce document décrit la **conception**. L'API REST sera développée avec NestJS, mais elle n'est pas encore écrite : rien de ce qui suit n'est implémenté, et le modèle de données n'est pas une base déjà créée.

Il distingue trois choses :
- ce qui est **imposé par le sujet** (par exemple OAuth avec des scopes distincts, ou le consentement vérifié à chaque accès) ;
- ce que nous avons **décidé** (le modèle de données et les choix de la section 3) ;
- ce qui est **encore ouvert** (section 6).

## 2. Modélisation des données

Notre MCD, réalisé avec Mocodo, comporte **6 entités et 8 associations**.

### Les entités

| Entité | Attributs | Rôle |
|---|---|---|
| PATIENT | id_patient, nom, prenom, date_naissance | La personne suivie. |
| SOIGNANT | id_soignant, nom, prenom, specialite, email | Le professionnel qui suit des patients et reçoit les alertes. |
| CONSENTEMENT | id_consentement, date_debut, date_fin | L'autorisation donnée par un patient à un soignant. |
| MESURE | id_mesure, horodatage, frequence_cardiaque, spo2, pas | Une mesure envoyée par la montre d'un patient. |
| SEUIL | id_seuil, type_mesure, valeur_min, valeur_max, actif | Les limites fixées pour un patient, pour un type de mesure. |
| ALERTE | id_alerte, horodatage, valeur_seuil, statut | Ce qui est créé quand une mesure dépasse un seuil. |

### Les associations et leurs cardinalités

Aucune association n'a d'attribut.

| Association | Entités concernées | Cardinalités | Signification |
|---|---|---|---|
| DONNER | PATIENT, CONSENTEMENT | PATIENT 0,N — CONSENTEMENT 1,1 | Un consentement est donné par un seul patient. |
| CONCERNER | SOIGNANT, CONSENTEMENT | SOIGNANT 0,N — CONSENTEMENT 1,1 | Un consentement concerne un seul soignant. |
| SUIVRE | PATIENT, SOIGNANT | PATIENT 0,N — SOIGNANT 0,N | Un patient peut avoir plusieurs soignants, et un soignant plusieurs patients. |
| POSSEDER | PATIENT, MESURE | PATIENT 0,N — MESURE 1,1 | Une mesure appartient à un seul patient. |
| AVOIR_SEUIL | PATIENT, SEUIL | PATIENT 0,N — SEUIL 1,1 | Un seuil appartient à un seul patient. |
| DECLENCHER | MESURE, ALERTE | MESURE 0,N — ALERTE 1,1 | Une alerte vient d'une seule mesure. |
| PROVOQUER | SEUIL, ALERTE | SEUIL 0,N — ALERTE 1,1 | Une alerte vient d'un seul seuil. |
| RECEVOIR | SOIGNANT, ALERTE | SOIGNANT 0,N — ALERTE 0,N | Une alerte peut être reçue par plusieurs soignants, et un soignant peut recevoir plusieurs alertes. |

### Le modèle Mocodo

Ce code permet de reproduire ou de modifier le MCD dans Mocodo.

```text
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

## 3. Choix de conception

Nous avons cherché un modèle simple, adapté à un projet scolaire. Ces choix sont des décisions prises. La colonne « Raison documentée » ne reprend que les raisons que nous avons données ; « Non précisée » signifie que nous n'en avons pas écrit. La colonne « Conséquence » décrit ce que le choix implique, pas une justification supplémentaire.

| Sujet | Décision | Raison documentée | Conséquence |
|---|---|---|---|
| Suivi | Un patient a plusieurs soignants et inversement. Pas d'historique des suivis. | Les fonctionnalités demandées n'ont pas besoin de l'historique. | On sait qui suit qui à l'instant présent, pas qui suivait qui avant. |
| Mesures | Une mesure appartient à un seul patient. Elle regroupe fréquence cardiaque, SpO₂, nombre de pas et l'heure de la mesure. | Non précisée. | Une même mesure peut dépasser plusieurs seuils. |
| Seuils | Les seuils sont définis patient par patient, avec un minimum et un maximum pour un type de mesure. | Repérer les valeurs anormales d'un patient (rôle du seuil). Raison du choix par patient non précisée. | Chaque patient a ses propres limites. |
| Alertes | Une alerte est liée à la mesure qui l'a provoquée et au seuil dépassé. Elle est reçue par un ou plusieurs soignants. Ni date d'envoi ni date de lecture. | Garder un modèle simple. | Une mesure peut donner plusieurs alertes. On ne sait pas quand une alerte a été envoyée ou lue. |
| Consentement | Il relie un patient et un soignant. `date_debut` marque le début de sa validité, `date_fin` sa fin ou son retrait. Pas d'historique des retraits. | Non précisée. `date_fin` sert à représenter la fin ou le retrait. | Le retrait se lit dans `date_fin`. On ne garde pas la trace des retraits passés. |

## 4. Règles métier

Le MCD décrit les données, pas ces règles : l'API devra les faire respecter.

1. **Consulter les mesures.** Un soignant ne voit les mesures d'un patient que s'il le suit **et** qu'un consentement valide de ce patient l'y autorise.
2. **Retrait du consentement.** Dès que le consentement est retiré, le soignant n'a plus accès aux données concernées.
3. **Créer une alerte.** Une alerte est créée quand une mesure dépasse un seuil applicable.
4. **Même patient.** La mesure et le seuil d'une alerte doivent appartenir au même patient. Le MCD ne peut pas l'exprimer : il faudra le vérifier à la création de l'alerte.

## 5. Sécurité et contrôle des accès

**Imposé par le sujet :**

- **OAuth avec des scopes distincts** pour les montres, les patients et les soignants.
- **Consentement vérifié à chaque accès**, et non une seule fois.
- **Réponses minimales** : l'API ne renvoie que les données nécessaires.
- **Pas de données de santé dans les logs**, y compris dans les messages d'erreur.

**Conséquence de nos règles métier :** un scope dit ce que l'appelant a le droit de faire, mais pas sur quels patients. Pour qu'un soignant accède aux données d'un patient, il faut donc le scope adapté, le suivi du patient et un consentement valide (règles 1 et 2).

## 6. Points à clarifier

Ces points ne sont pas tranchés. Aucun n'est une décision validée.

### Métier

1. **Consentement valide.** `date_fin` peut-elle être vide (consentement sans fin) ? Un patient peut-il avoir plusieurs consentements pour un même soignant, par exemple un nouveau après un retrait ?
2. **Dépassement d'un seuil.** Il y a dépassement quand la valeur sort de l'intervalle entre `valeur_min` et `valeur_max`, à confirmer. À préciser aussi : le rôle de `actif`, et s'il peut y avoir plusieurs seuils pour un même type de mesure et un même patient.
3. **Soignants prévenus.** Tous ceux qui suivent le patient, ou seulement ceux qui ont un consentement valide ?

### Modélisation

4. **Acquittement individuel des alertes : incohérence à trancher.** Nous avions décidé qu'un soignant acquitte une alerte pour lui seul. Or `statut` est porté par l'alerte, donc commun à tous les soignants, et `RECEVOIR` n'a pas d'attribut. Le modèle actuel ne permet donc pas l'acquittement individuel. Il faut soit changer cette décision, soit modifier le MCD.
5. **Attributs de l'alerte.** Que contient `valeur_seuil`, et quelles valeurs peut prendre `statut` ?

### Contrats techniques

6. **Identité OAuth.** Il n'y a pas d'entité pour les comptes. Il faut préciser comment l'identité d'un patient ou d'un soignant est reliée à son entité, et choisir les noms des scopes.
7. **Contrat d'API.** Le tableau des 12 endpoints est dans notre Google Docs, pas encore dans le dépôt.
