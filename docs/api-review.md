# Revue des réponses HTTP — Veillo

Ce document regroupe les réponses envisagées pour chaque endpoint décrit dans [api.md](api.md). Il ne décrit pas des réponses déjà implémentées ou testées.

Les codes sont repris du contrat en cours de conception ; les précisions restant à valider sont signalées dans chaque bloc. Les noms des scopes, les formats JSON et les critères détaillés de validation ne sont pas encore arrêtés.

---

#### `POST /measurements`

**Objectif**

Enregistrer les mesures envoyées par les montres connectées pour assurer le suivi des patients.

**Réponses de succès**

- `201 Created` : Le lot a été validé et enregistré avec toutes ses mesures dans une transaction.

**Réponses d’erreur**

- `400 Bad Request` : Les données du lot sont invalides ; un seul relevé invalide entraîne le rejet du lot entier.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : L’appelant authentifié n’est pas autorisé à transmettre les mesures.
- `409 Conflict` : Le `batchId` a déjà été utilisé, que le contenu soit identique ou différent ; aucune nouvelle mesure n’est enregistrée.

**Règles particulières**

- Le `batchId` identifie un lot de manière unique. Un identifiant inconnu permet de poursuivre l’enregistrement ; tout identifiant déjà enregistré entraîne un conflit, même si le contenu est identique.
- La validation porte sur tout le lot et l’enregistrement est atomique : toutes les mesures sont enregistrées ou aucune ne l’est.
- Le format JSON, les critères de validation, l’identification de la montre, le rattachement au patient et la structure de stockage restent à définir.

---

#### `GET /patients/{patientId}/measurements`

**Objectif**

Récupérer les mesures d’un patient sur une période donnée pour suivre leur évolution.

**Réponses de succès**

- `200 OK` : Les mesures du patient correspondant à la période et à la page demandées sont récupérées.

**Réponses d’erreur**

- `400 Bad Request` : Les paramètres de période ou de pagination sont invalides, notamment si `size` dépasse 100.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : Le soignant n’a pas les autorisations nécessaires, ne suit pas le patient ou ne dispose pas d’un consentement valide.
- `404 Not Found` : Le patient demandé est introuvable.

**Règles particulières**

- L’accès exige à la fois les droits nécessaires, le suivi du patient et un consentement valide.
- La pagination commence à 0, avec `page=0` et `size=50` par défaut, et un maximum de 100 mesures par page.
- Les formats des dates et les règles précises de validation de la période restent à définir.

---

#### `GET /patients`

**Objectif**

Afficher les patients suivis par le soignant connecté.

**Réponses de succès**

- `200 OK` : La liste paginée des patients suivis par le soignant connecté est récupérée.

**Réponses d’erreur**

- `400 Bad Request` : Les paramètres de pagination sont invalides ; la taille maximale documentée est de 100 patients.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : L’appelant authentifié n’est pas autorisé à consulter la liste des patients.

**Règles particulières**

- Seuls les patients liés au soignant connecté par `SUIVRE` sont retournés.
- Pagination : `page=0` et `size=50` par défaut, maximum 100 patients par page.

---

#### `GET /patients/{patientId}`

**Objectif**

Consulter les informations d’un patient suivi.

**Réponses de succès**

- `200 OK` : Les informations du patient suivi sont récupérées.

**Réponses d’erreur**

- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : Le soignant ne suit pas le patient ou n’a pas les autorisations nécessaires pour consulter ses informations.
- `404 Not Found` : Le patient demandé est introuvable.

**Règles particulières**

- Le soignant doit suivre le patient et disposer des autorisations nécessaires.
- L’application du consentement aux informations d’identité du patient reste à confirmer ; aucun contrôle supplémentaire n’est décidé ici.

---

#### `GET /alerts`

**Objectif**

Afficher les alertes des patients suivis, qu’elles soient actives ou déjà traitées.

**Réponses de succès**

- `200 OK` : Les alertes des patients suivis sont récupérées selon les filtres et la pagination demandés.

**Réponses d’erreur**

- `400 Bad Request` : Les filtres ou les paramètres de pagination sont invalides ; la taille maximale documentée est de 100 alertes.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : L’appelant authentifié n’est pas autorisé à consulter les alertes.

**Règles particulières**

- La liste couvre les alertes actives et traitées, uniquement pour les patients suivis.
- Filtres facultatifs : patient, statut et période. Pagination : `page=0`, `size=50`, maximum 100 alertes par page.
- Le contrôle du consentement n’est pas précisé dans le bloc de liste, contrairement au détail ; son application reste à valider.

---

#### `GET /alerts/{alertId}`

**Objectif**

Consulter les détails d’une alerte pour identifier le patient concerné et la mesure qui l’a déclenchée.

**Réponses de succès**

- `200 OK` : Les détails de l’alerte demandée sont récupérés.

**Réponses d’erreur**

- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : Le soignant ne suit pas le patient concerné, n’a pas les autorisations nécessaires ou ne dispose pas d’un consentement valide.
- `404 Not Found` : L’alerte demandée est introuvable.

**Règles particulières**

- L’accès au détail exige le suivi du patient, les autorisations nécessaires et un consentement valide.

---

#### `PATCH /alerts/{alertId}`

**Objectif**

Marquer une alerte comme traitée après sa prise en charge par le soignant.

**Réponses de succès**

- `200 OK` : L’alerte a été marquée `TRAITEE`.

**Réponses d’erreur**

- `400 Bad Request` : Le statut transmis est invalide ; la valeur de mise à jour prévue est `TRAITEE`.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : L’appelant authentifié n’est pas autorisé à traiter cette alerte, notamment s’il ne suit pas le patient concerné.
- `404 Not Found` : L’alerte demandée est introuvable.
- `409 Conflict` : L’alerte est déjà traitée ou la transition de statut demandée est interdite.

**Règles particulières**

- Une alerte est créée `ACTIVE` et peut passer à `TRAITEE`. Une alerte traitée ne peut pas être réactivée et reste dans l’historique.
- La frontière entre statut invalide (400) et transition interdite (409) reste à préciser pour les cas qui pourraient relever des deux.
- Le contrôle du consentement n’est pas précisé pour cette modification ; son application reste à valider.

---

#### `GET /patients/me/consents`

**Objectif**

Consulter les consentements donnés par le patient connecté.

**Réponses de succès**

- `200 OK` : Les consentements du patient identifié par son authentification sont récupérés.

**Réponses d’erreur**

- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : L’appelant authentifié n’est pas autorisé à consulter les consentements en tant que patient.

**Règles particulières**

- Les consentements sont ceux du patient identifié par son authentification, sans identifiant de patient fourni en paramètre.

---

#### `DELETE /patients/me/consents/{consentId}`

**Objectif**

Retirer un consentement précédemment donné pour mettre fin aux accès concernés.

**Réponses de succès**

- `204 No Content` : Le retrait du consentement appartenant au patient connecté est enregistré ; la réponse ne contient pas de corps.

**Réponses d’erreur**

- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : Le consentement existe mais appartient à un autre patient.
- `404 Not Found` : Le consentement demandé est introuvable.

**Règles particulières**

- La distinction retenue est 403 pour un consentement appartenant à un autre patient, et 404 pour un consentement introuvable.
- Le retrait conserve la trace du consentement et de son retrait, ainsi que l’historique des données. Il empêche les accès futurs concernés.
- Le comportement d’un nouveau retrait sur un consentement déjà retiré reste à valider ; aucun code supplémentaire n’est retenu ici.

---

#### `GET /patients/{patientId}/seuils`

**Objectif**

Consulter les seuils configurés pour surveiller les mesures d’un patient.

**Réponses de succès**

- `200 OK` : Les seuils configurés pour le patient sont récupérés.

**Réponses d’erreur**

- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : Le soignant ne suit pas le patient ou n’a pas les autorisations nécessaires pour consulter ses seuils.
- `404 Not Found` : Le patient demandé est introuvable.

**Règles particulières**

- Le soignant doit suivre le patient et disposer des autorisations nécessaires. Les seuils retournés comprennent leur état actif ou désactivé.

---

#### `POST /patients/{patientId}/seuils`

**Objectif**

Créer un seuil définissant les limites qui déclenchent des alertes pour les mesures d’un patient.

**Réponses de succès**

- `201 Created` : Le nouveau seuil du patient a été enregistré.

**Réponses d’erreur**

- `400 Bad Request` : Les données du seuil sont invalides ; les critères précis de validation restent à définir.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : Le soignant ne suit pas le patient ou n’a pas les autorisations nécessaires pour créer un seuil.
- `404 Not Found` : Le patient demandé est introuvable.
- `409 Conflict` : Un seuil actif du même type existe déjà pour ce patient ; la création est refusée.

**Règles particulières**

- Un seul seuil actif est autorisé par patient et type de mesure. La création est refusée si un seuil actif du même type existe déjà.

---

#### `PATCH /patients/{patientId}/seuils/{seuilId}`

**Objectif**

Adapter les valeurs d’un seuil ou l’activer ou le désactiver pour ajuster la surveillance du patient.

**Réponses de succès**

- `200 OK` : Les valeurs ou l’état du seuil ont été modifiés.

**Réponses d’erreur**

- `400 Bad Request` : Les nouvelles données du seuil sont invalides ; les critères précis de validation restent à définir.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : Le soignant n’a pas les autorisations nécessaires ou ne suit pas le patient. Le seuil doit également appartenir au patient indiqué ; le code de refus pour une discordance reste à valider.
- `404 Not Found` : Le patient ou le seuil demandé est introuvable.
- `409 Conflict` : L’activation entrerait en conflit avec un autre seuil actif du même type pour ce patient.

**Règles particulières**

- Seuls les champs à modifier sont transmis : minimum, maximum ou état.
- Un seul seuil actif est autorisé par patient et type ; l’activation est refusée si un autre seuil actif du même type existe déjà.
- La désactivation conserve le seuil dans l’historique.
- Le code à retourner si le seuil existe mais appartient à un autre patient reste à valider.
