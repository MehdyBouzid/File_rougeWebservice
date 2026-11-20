# Revue des réponses HTTP — Veillo

Ce document regroupe les réponses attendues pour chaque endpoint décrit dans [api.md](api.md). Les vérifications du mock sont distinguées de l’implémentation du backend, qui reste à développer.

Les codes sont repris du contrat en cours de conception ; les précisions restant à valider sont signalées dans chaque bloc. Les noms des scopes, certains formats JSON et les critères détaillés de validation ne sont pas encore arrêtés.

**Règles HTTP communes**

- `401` : authentification absente ou invalide. L’en-tête `WWW-Authenticate` est obligatoire pour les 13 opérations ; le composant partagé fournit un exemple `Bearer`. Les paramètres du challenge restent à préciser avec OAuth.
- `403` : appelant authentifié dont le rôle ou le scope est insuffisant pour l’opération (BFLA). Les trois types de clients (montre, patient, soignant) ont des scopes distincts. Ce code ne traduit jamais l’appartenance d’un objet.
- `404` : objet inexistant **ou hors du périmètre autorisé de l’appelant** (BOLA), en lecture comme en écriture : patient non suivi, seuil rattaché à un autre patient, consentement d’un autre patient, consentement valide exigé mais absent ou retiré. Les cas ne sont pas distinguables dans la réponse.
- Collections (`GET /patients`, `GET /alerts`) : elles ne retournent que les objets accessibles, quels que soient les filtres. Un filtre sur un patient inexistant ou non accessible donne une liste vide en `200`, jamais `403` ni `404`.
- Consentement : vérifié à chaque accès concerné. Son périmètre exact reste à valider par opération (voir [design.md](design.md#périmètre-du-contrôle-du-consentement)) ; là où il est exigé, son absence ou son retrait renvoie `404` (ou exclut l’objet d’une collection).
- `400` concerne les données ou paramètres invalides ; `409` concerne les conflits documentés : lot déjà reçu, seuil actif existant ou état d’alerte incompatible. Les cas encore ambigus sont signalés ci-dessous.
- `304` : réponse sans corps, avec `ETag`. `412` et `428` utilisent `application/problem+json`. La RFC 9110 impose d’évaluer les préconditions après `401`, `403` et `404` et avant le traitement du contenu (`400` sur l’état, `409`).
- Les deux réponses `201` exigent `Location` pour identifier la ressource créée. L’URI du lot reste à définir ; celle du seuil est illustrée dans OpenAPI. Cela n’impose pas d’ajouter une route GET.
- La réponse `204` de retrait ne contient aucun corps ; aucun JSON d’erreur ou de confirmation ne doit y être ajouté.
- Les erreurs documentées utilisent `application/problem+json` et le schéma `Problem`. `status` doit correspondre au statut HTTP ; `type` identifie le problème et `title` en donne un libellé général. `detail` et `instance` sont facultatifs. Aucun secret, détail SQL ou donnée de santé ne doit être exposé.

Références : [RFC 9110 — challenge d’authentification](https://www.rfc-editor.org/rfc/rfc9110.html#section-11.6.1) et [RFC 9457 — Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html#section-3.1).

**Erreurs techniques et décisions ouvertes**

Les réponses techniques suivantes ne sont pas encore déclarées par opération dans OpenAPI ; leur ajout reste à valider : `405` avec `Allow` pour une méthode non autorisée sur une ressource existante, `415` pour un média de requête refusé et `500` pour une erreur interne imprévue, sans détail sensible.

`422` n’est pas nécessaire pour remplacer les validations actuellement décrites avec `400`. `304`, `412` et `428` sont déclarés uniquement pour les seuils (ETag, `If-None-Match`, `If-Match`), selon les exigences du formateur ; voir le [guide des seuils](contrats/seuils.md#requêtes-conditionnelles-etag). `429` dépendrait d’une limitation de débit, non décidée.

**Contrat, mock et backend**

Prism simule les réponses et vérifie les contraintes de schéma ; il ne vérifie ni les signatures JWT, ni les droits métier, ni les conflits en base. Les erreurs forcées ne prouvent pas que leur situation métier a été détectée.

Avec Prism 5.14.2, les contrôles ont observé un `400` en `application/json` pour un JSON mal formé, un `405` sans `Allow` pour une méthode non définie et un `400` pour un média non prévu. Ces comportements du mock ne redéfinissent pas le contrat cible. Le backend devra encore appliquer les statuts, les en-têtes et le format d’erreur retenus ; sa normalisation des exceptions n’est pas implémentée.

---

#### `POST /measurements`

**Objectif**

Enregistrer les mesures envoyées par les montres connectées pour assurer le suivi des patients.

**Réponses de succès**

- `201 Created` : Le lot a été validé et enregistré avec toutes ses mesures dans une transaction.

**Réponses d’erreur**

- `400 Bad Request` : Les données du lot sont invalides ; un seul relevé invalide entraîne le rejet du lot entier.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : le scope montre manque : l’appelant n’est pas un client montre.
- `404 Not Found` : le patient indiqué par `patientId` est inexistant ou n’est pas rattaché à l’émetteur authentifié (BOLA en écriture).
- `409 Conflict` : Le `batchId` a déjà été utilisé, que le contenu soit identique ou différent ; aucune nouvelle mesure n’est enregistrée.

**Règles particulières**

- Le `batchId` identifie un lot de manière unique. Un identifiant inconnu permet de poursuivre l’enregistrement ; tout identifiant déjà enregistré entraîne un conflit, même si le contenu est identique.
- La validation porte sur tout le lot et l’enregistrement est atomique : toutes les mesures sont enregistrées ou aucune ne l’est.
- Le lot contient `patientId`, `batchId` et un tableau non vide `measurements`. Chaque relevé exige `horodatage`, `frequenceCardiaque`, `spo2` et `pas` ; `pas` représente les pas depuis le relevé précédent. Le JSON et les types sont décrits dans [api.md](api.md#1-ingestion-des-mesures).
- Les types d’identifiants, les unités et bornes numériques, l’identification de l’émetteur, son autorisation pour le patient indiqué et la structure de stockage restent à définir.
- Un `patientId` inexistant ou non rattaché à l’émetteur renvoie `404` ; le mécanisme de rattachement montre-patient reste à définir. Le corps de confirmation et l’URI du lot dans `Location` restent également ouverts, comme indiqué dans le [guide des mesures](contrats/mesures.md#4-réponses-http-prévues).

---

#### `GET /patients/{patientId}/measurements`

**Objectif**

Récupérer les mesures d’un patient sur une période donnée pour suivre leur évolution.

**Réponses de succès**

- `200 OK` : Les mesures du patient correspondant à la période et à la page demandées sont récupérées.

**Réponses d’erreur**

- `400 Bad Request` : Les paramètres de période ou de pagination sont invalides, notamment si `size` dépasse 100.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : le scope soignant manque.
- `404 Not Found` : patient inexistant, non suivi par le soignant ou sans consentement valide (BOLA).

**Règles particulières**

- L’accès exige le scope soignant, le suivi du patient et un consentement valide ; les deux derniers manquants donnent `404`, pas `403`.
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
- `403 Forbidden` : le scope soignant manque.

**Règles particulières**

- Seuls les patients liés au soignant connecté par `SUIVRE` sont retournés ; la collection n’expose jamais un patient non suivi.
- Si le contrôle du consentement est retenu, les patients sans consentement valide sont aussi exclus (à valider).
- Pagination : `page=0` et `size=50` par défaut, maximum 100 patients par page.

---

#### `GET /patients/{patientId}`

**Objectif**

Consulter les informations d’un patient suivi.

**Réponses de succès**

- `200 OK` : Les informations du patient suivi sont récupérées.

**Réponses d’erreur**

- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : le scope soignant manque.
- `404 Not Found` : patient inexistant ou non suivi par le soignant (BOLA).

**Règles particulières**

- Le soignant doit avoir le scope soignant et suivre le patient ; un patient non suivi est traité comme inexistant.
- L’application du consentement aux informations d’identité du patient reste à confirmer ; si elle est retenue, son absence renvoie aussi `404`.

---

#### `GET /alerts`

**Objectif**

Afficher les alertes des patients suivis, qu’elles soient actives ou déjà traitées.

**Réponses de succès**

- `200 OK` : Les alertes des patients suivis sont récupérées selon les filtres et la pagination demandés.

**Réponses d’erreur**

- `400 Bad Request` : Les filtres ou les paramètres de pagination sont invalides ; la taille maximale documentée est de 100 alertes.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : le scope soignant manque.

**Règles particulières**

- La liste couvre les alertes actives et traitées, uniquement pour les patients accessibles au soignant.
- Filtres facultatifs : patient, statut et période. Pagination : `page=0`, `size=50`, maximum 100 alertes par page.
- Le contrôle du consentement n’est pas précisé dans le bloc de liste, contrairement au détail ; son application reste à valider.
- Un filtre `patientId` sur un patient inexistant ou non accessible donne une liste vide en `200` ; aucun filtre n’élargit le périmètre des patients suivis.

---

#### `GET /alerts/{alertId}`

**Objectif**

Consulter les détails d’une alerte pour identifier le patient concerné et la mesure qui l’a déclenchée.

**Réponses de succès**

- `200 OK` : Les détails de l’alerte demandée sont récupérés.

**Réponses d’erreur**

- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : le scope soignant manque.
- `404 Not Found` : alerte inexistante, concernant un patient non suivi ou sans consentement valide (BOLA).

**Règles particulières**

- L’accès au détail exige le scope soignant, le suivi du patient et un consentement valide.

---

#### `PATCH /alerts/{alertId}`

**Objectif**

Marquer une alerte comme traitée après sa prise en charge par le soignant.

**Réponses de succès**

- `200 OK` : L’alerte a été marquée `TRAITEE`.

**Réponses d’erreur**

- `400 Bad Request` : Le statut transmis est invalide ; la valeur de mise à jour prévue est `TRAITEE`.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : le scope soignant manque.
- `404 Not Found` : alerte inexistante ou concernant un patient non suivi (BOLA en écriture).
- `409 Conflict` : L’alerte est déjà traitée ou la transition de statut demandée est interdite.

**Règles particulières**

- Une alerte est créée `ACTIVE` et peut passer à `TRAITEE`. Une alerte traitée ne peut pas être réactivée et reste dans l’historique.
- La frontière entre statut invalide (400) et transition interdite (409) reste à préciser pour les cas qui pourraient relever des deux.
- Le contrôle du consentement n’est pas précisé pour cette modification ; son application reste à valider. Si elle est retenue, son absence renvoie `404`.

---

#### `GET /patients/me/consents`

**Objectif**

Consulter les consentements donnés par le patient connecté.

**Réponses de succès**

- `200 OK` : Les consentements du patient identifié par son authentification sont récupérés.

**Réponses d’erreur**

- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : le scope patient manque (par exemple jeton de soignant ou de montre).

**Règles particulières**

- Les consentements sont ceux du patient identifié par son authentification, sans identifiant de patient fourni en paramètre ; ceux d’un autre patient ne sont jamais retournés.

---

#### `DELETE /patients/me/consents/{consentId}`

**Objectif**

Retirer un consentement précédemment donné pour mettre fin aux accès concernés.

**Réponses de succès**

- `204 No Content` : Le retrait du consentement appartenant au patient connecté est enregistré ; la réponse ne contient pas de corps.

**Réponses d’erreur**

- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : le scope patient manque.
- `404 Not Found` : consentement inexistant ou appartenant à un autre patient (BOLA en écriture).

**Règles particulières**

- Un consentement appartenant à un autre patient est traité comme inexistant : `404`, sans distinction.
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
- `403 Forbidden` : le scope soignant manque.
- `404 Not Found` : patient inexistant ou non suivi par le soignant (BOLA).

**Règles particulières**

- Le soignant doit avoir le scope soignant et suivre le patient ; le consentement reste à valider (si retenu, son absence renvoie `404`). Les seuils retournés comprennent leur état actif ou désactivé.

---

#### `GET /patients/{patientId}/seuils/{seuilId}`

**Objectif**

Lire un seuil et obtenir son `ETag` pour une modification conditionnelle.

**Réponses de succès**

- `200 OK` : le seuil demandé est récupéré, avec l’en-tête `ETag`.
- `304 Not Modified` : `If-None-Match` correspond à l’état courant ; aucun corps, `ETag` répété.

**Réponses d’erreur**

- `401 Unauthorized` : authentification absente ou invalide.
- `403 Forbidden` : le scope soignant manque.
- `404 Not Found` : patient inexistant ou non suivi, seuil inexistant ou rattaché à un autre patient (BOLA).

**Règles particulières**

- `If-None-Match` n’est évalué qu’après `401`, `403` et `404`, et seulement si la réponse aurait été `200`.
- Le consentement reste à valider ; s’il est retenu, son absence renvoie `404`.

---

#### `POST /patients/{patientId}/seuils`

**Objectif**

Créer un seuil définissant les limites qui déclenchent des alertes pour les mesures d’un patient.

**Réponses de succès**

- `201 Created` : Le nouveau seuil du patient a été enregistré et activé automatiquement. La réponse contient `Threshold` et les en-têtes `Location` (GET individuel) et `ETag`.

**Réponses d’erreur**

- `400 Bad Request` : Une propriété obligatoire manque, le type est invalide, une valeur est nulle, une propriété est inconnue ou `valeurMin > valeurMax`.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : le scope soignant manque.
- `404 Not Found` : patient inexistant ou non suivi par le soignant (BOLA en écriture).
- `409 Conflict` : Un seuil actif du même type existe déjà pour ce patient ; la création est refusée.

**Règles particulières**

- Un seul seuil actif est autorisé par patient et type de mesure. La création est refusée si un seuil actif du même type existe déjà.
- `typeMesure`, `valeurMin` et `valeurMax` sont obligatoires ; l’enum commune aux alertes est `FREQUENCE_CARDIAQUE`, `SPO2`, `PAS`. Le backend fixe `actif` à `true`.
- `valeurMin <= valeurMax` est requis, égalité autorisée ; le backend réalise cette comparaison entre propriétés.

---

#### `PATCH /patients/{patientId}/seuils/{seuilId}`

**Objectif**

Adapter les valeurs d’un seuil ou l’activer ou le désactiver pour ajuster la surveillance du patient.

**Réponses de succès**

- `200 OK` : Les valeurs ou l’état du seuil ont été modifiés.

**Réponses d’erreur**

- `400 Bad Request` : Le corps est vide, une valeur est nulle, un type est invalide, une propriété est inconnue ou les bornes finales ne respectent pas `valeurMin <= valeurMax`.
- `401 Unauthorized` : L’authentification de l’appelant est invalide ; aucun appelant authentifié ne peut être établi.
- `403 Forbidden` : le scope soignant manque.
- `404 Not Found` : patient inexistant ou non suivi, seuil inexistant ou rattaché à un autre patient que celui du chemin (BOLA en écriture).
- `409 Conflict` : L’activation entrerait en conflit avec un autre seuil actif du même type pour ce patient.
- `412 Precondition Failed` : `If-Match` ne correspond plus à l’`ETag` courant.
- `428 Precondition Required` : `If-Match` est absent.

**Règles particulières**

- `If-Match` est exigé. Il est déclaré facultatif dans OpenAPI pour que `428` reste atteignable avec les outils de validation.
- Ordre : `401`, `403`, `404`, `428`, `412`, puis `400` et `409`.
- Seuls les champs à modifier sont transmis : minimum, maximum ou état.
- Le PATCH exige au moins un champ parmi `valeurMin`, `valeurMax` et `actif`. Le backend valide l’intervalle après combinaison avec les valeurs conservées ; patient et type de mesure ne sont pas modifiables.
- Un seul seuil actif est autorisé par patient et type ; l’activation est refusée si un autre seuil actif du même type existe déjà.
- La désactivation conserve le seuil dans l’historique.
- Un seuil appartenant à un autre patient renvoie `404`, comme un seuil inexistant.
- Le consentement reste à valider pour les seuils ; s’il est retenu, son absence renvoie `404`.
- Le futur backend vérifiera l’`ETag` et écrira dans une même transaction (`FOR UPDATE`), avec un index unique partiel pour l’unicité du seuil actif ; mécanisme non implémenté, voir le [guide des seuils](contrats/seuils.md#requêtes-conditionnelles-etag).
