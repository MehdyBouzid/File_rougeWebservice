# Veillo — Télésuivi de patients

## 1. Présentation du projet

Veillo est le projet fil rouge du **Mastère 2 Web Services**, **sujet 6 : télésuivi de patients à domicile**. Les montres connectées seront simulées et toutes les données de santé seront fictives.

Les objectifs du projet sont :

- transmettre par lots, toutes les minutes, des mesures de fréquence cardiaque, de SpO₂ et de nombre de pas ;
- gérer des seuils et générer des alertes en cas de dépassement ;
- permettre aux personnes autorisées de consulter les mesures ;
- gérer le consentement des patients et son retrait ;
- authentifier les montres, les patients et les soignants avec OAuth et des scopes distincts.

**Ces fonctionnalités sont des objectifs : elles ne sont pas encore implémentées.** Le dépôt contient actuellement un socle backend et des documents de conception. Ce README suit la progression du projet par TP.

## 2. Équipe

Les quatre membres et leurs rôles restent à renseigner.

| Membre | Rôle dans le projet |
|---|---|
| À compléter | À compléter |
| À compléter | À compléter |
| À compléter | À compléter |
| À compléter | À compléter |

## 3. Architecture et technologies

L'architecture cible relie un simulateur de montre et une application Angular/Ionic à une API REST NestJS/TypeScript, avec PostgreSQL comme base de données envisagée pour la persistance.

| Composant | État dans le dépôt |
|---|---|
| Simulateur de montre connectée | Prévu ; absent du dépôt |
| Backend API REST NestJS/TypeScript | Squelette présent dans `backend/`, sans contrôleur ni fonctionnalité métier |
| Base de données PostgreSQL | Prévue ; aucune intégration configurée |
| Application Angular/Ionic | Prévue ; aucun frontend présent actuellement |
| Authentification OAuth 2.0 avec scopes distincts | Prévue conformément au sujet ; aucune intégration présente |

Les versions ci-dessous sont les **contraintes déclarées** dans [backend/package.json](backend/package.json), et non un relevé des versions installées. Le fichier `backend/package-lock.json` verrouille les dépendances pour `npm ci`.

| Technologie ou outil | Version déclarée | Usage |
|---|---|---|
| Node.js | `22.x` ; `.nvmrc` : `22` | Exécution du backend avec npm |
| NestJS | `^11.0.1` pour common, core et platform-express | Socle de l'API REST sur Express |
| TypeScript | `^5.7.3` | Langage du backend |
| Jest / Supertest | `^30.0.0` / `^7.0.0` | Tests techniques unitaires et end-to-end |
| ESLint / Prettier | `^9.18.0` / `^3.4.2` | Analyse et formatage du code |

Les dépendances backend comprennent également `reflect-metadata` (`^0.2.2`) et RxJS (`^7.8.1`). Aucune dépendance PostgreSQL, OAuth ou JWT n’est déclarée dans `backend/package.json`. **OAuth 2.0 avec des scopes distincts est prévu conformément au sujet** ; les JWT sont une possibilité technique à étudier, pas un choix déjà validé.

Le backend actuel utilise **NestJS et TypeScript**. La migration depuis l'ancien socle est retracée dans la section 5.1.

## 4. Organisation du dépôt

Arborescence abrégée des fichiers et dossiers présents :

```text
FileRougeM2/
├── .gitignore
├── backend/                  # projet NestJS/TypeScript
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── app.module.spec.ts
│   │   └── features/          # .gitkeep uniquement
│   ├── test/
│   │   ├── e2e/
│   │   └── integration/       # .gitkeep uniquement
│   ├── .nvmrc
│   ├── package.json
│   └── package-lock.json
├── bruno/
│   ├── bruno.json
│   ├── 01-get-parametre.bru
│   ├── 02-post-json.bru
│   ├── 03-erreur-404.bru
│   ├── 04-accept-svg.bru
│   └── 05-fhir-patient.bru
├── docs/
│   ├── design.md
│   └── http.md
├── IA.md
└── README.md
```

- [backend/](backend/) : projet NestJS/TypeScript, socle de l'API, configuration des outils et tests techniques.
- [bruno/](bruno/) : collection de requêtes HTTP et assertions automatiques.
- [docs/](docs/) : exploration HTTP et conception du modèle de données.
- [IA.md](IA.md) : déclaration des outils et usages de l'IA, avec leurs limites.
- [README.md](README.md) : présentation du projet, progression par TP et procédures de reproduction.

## 5. TP1 — Initialisation et découverte HTTP

Le TP1 pose les bases du dépôt et de l'environnement, puis explore HTTP avec curl et Bruno. Référence interne : **NC-201**.

### 5.1 Dépôt et environnement

L'historique Git contient un premier commit daté du **26 octobre 2026** et une migration vers NestJS le **30 octobre 2026** (`f71b8af`). Le premier socle utilisait Java/Spring Boot et Ionic/Angular ; le backend a été remplacé par NestJS/TypeScript et le frontend retiré. Ces technologies historiques ne décrivent donc pas le contenu actuel du dépôt.

Le dépôt distant `origin` pointe vers [MehdyBouzid/File_rougeWebservice](https://github.com/MehdyBouzid/File_rougeWebservice). La branche consultée pour cette révision est `dev`. Les fichiers `.gitignore` à la racine et dans `backend/` sont présents.

Git, Node.js 22 et curl font partie des outils vérifiés pour préparer l'environnement du TP1.

Pour installer et démarrer le backend depuis la racine du dépôt, avec **Node.js 22 et npm** :

```bash
cd backend
npm ci
npm run start:dev
```

Le point d'entrée `src/main.ts` écoute sur `PORT` si cette variable est définie, sinon sur **3000**. Le module racine est vide : aucune route métier n'est exposée, et `GET /` doit répondre **404**. Aucune base de données n'est nécessaire à ce stade.

### 5.2 Exploration HTTP avec curl

Le document [docs/http.md](docs/http.md) consigne quatre exercices réalisés avec curl sur httpbin le **30 octobre 2026** : commandes complètes, extraits de réponse, statuts et deux en-têtes expliqués par exercice. Le quatrième exercice comprend deux appels pour comparer les formats.

| Exercice | Requête | Résultat consigné dans `docs/http.md` |
|---|---|---|
| Paramètre de requête | `GET https://httpbin.org/get?patient=42` | 200 ; `args.patient` vaut `"42"` |
| Corps JSON | `POST https://httpbin.org/post` avec `Content-Type: application/json` et `{"frequenceCardiaque":72}` | 200 ; le JSON est décodé dans le champ `json` |
| Erreur HTTP | `GET https://httpbin.org/status/404` | 404 ; corps vide |
| Négociation de contenu | `GET https://httpbin.org/image` avec deux valeurs de `Accept` | 200 ; réponse SVG ou PNG selon le format demandé |

L'option `curl -i` affiche les en-têtes et le corps. Les exercices permettent de distinguer les paramètres d'URL, le corps de requête, les statuts HTTP et les en-têtes de requête et de réponse. Les résultats ci-dessus sont ceux documentés dans le dépôt ; les appels externes n'ont pas été rejoués pour cette révision.

### 5.3 Collection Bruno

La collection [bruno/](bruno/) contient `bruno.json` et **cinq requêtes**, avec **neuf assertions automatiques** vérifiables dans les fichiers `.bru`. Les quatre premières reprennent les exercices httpbin. La cinquième utilise un serveur public de test HAPI FHIR pour explorer une API du domaine de la santé ; elle ne représente pas une intégration FHIR dans Veillo.

| Fichier | Requête | Assertions présentes |
|---|---|---|
| [01-get-parametre.bru](bruno/01-get-parametre.bru) | `GET /get?patient=42` sur httpbin | Statut 200 ; `args.patient === "42"` |
| [02-post-json.bru](bruno/02-post-json.bru) | `POST /post` sur httpbin, avec un corps JSON | Statut 200 ; `json.frequenceCardiaque === 72` |
| [03-erreur-404.bru](bruno/03-erreur-404.bru) | `GET /status/404` sur httpbin | Statut 404 |
| [04-accept-svg.bru](bruno/04-accept-svg.bru) | `GET /image` sur httpbin, `Accept: image/svg+xml` | Statut 200 ; `Content-Type === image/svg+xml` |
| [05-fhir-patient.bru](bruno/05-fhir-patient.bru) | `GET https://hapi.fhir.org/baseR4/Patient?_count=1`, `Accept: application/fhir+json` | Statut 200 ; `resourceType === "Bundle"` |

L'ancien README déclare une exécution Bruno réussie : **5 requêtes sur 5 et 9 tests sur 9**. Il mentionne des captures d'écran du rapport, **non versionnées**. Le dépôt permet de vérifier les assertions et de reproduire leur exécution, mais ne contient pas de rapport permettant de confirmer ce résultat historique.

### 5.4 Négociation de contenu

`Content-Type` indique le format du contenu envoyé ; `Accept` indique le format de réponse souhaité. Sur `https://httpbin.org/image`, la même URL peut ainsi produire deux représentations :

| En-tête de requête | Statut consigné | En-tête de réponse consigné |
|---|---|---|
| `Accept: image/svg+xml` | 200 | `Content-Type: image/svg+xml` |
| `Accept: image/png` | 200 | `Content-Type: image/png` |

Ces deux réponses sont décrites dans [docs/http.md](docs/http.md). Dans Bruno, seule la variante SVG fait l'objet d'un test automatique.

**Limite des preuves :** l'ancien README déclare une vérification manuelle PNG dans Bruno, mais la note du fichier `04-accept-svg.bru` indique encore « Variante PNG non encore confirmée dans Bruno ». Aucune capture n'est versionnée pour trancher cette divergence. La variante PNG est donc documentée avec curl, mais sa validation dans Bruno reste à confirmer.

### 5.5 Reproduire les tests du TP1

#### Exploration HTTP avec curl

Prérequis : curl et une connexion Internet. Depuis un terminal, exécuter les commandes de [docs/http.md](docs/http.md). Pour vérifier les en-têtes de négociation sans afficher le corps binaire PNG :

```bash
curl -sS -D - -o /dev/null 'https://httpbin.org/image' -H 'Accept: image/svg+xml'
curl -sS -D - -o /dev/null 'https://httpbin.org/image' -H 'Accept: image/png'
```

Résultats attendus : les statuts et contenus indiqués en section 5.2, puis les deux `Content-Type` indiqués en section 5.4. Les valeurs variables, comme la date ou l'adresse IP, ne sont pas des critères de réussite.

#### Collection Bruno

Les requêtes ciblent **httpbin et HAPI FHIR**, pas le backend Veillo : il n'est pas nécessaire de lancer NestJS. Une connexion Internet et l'application Bruno sont nécessaires.

1. Ouvrir Bruno et choisir « Open Collection ».
2. Sélectionner le dossier `bruno/` contenant `bruno.json`.
3. Exécuter chaque requête ou lancer « Run Collection ».
4. Contrôler les statuts : **200** pour 01, 02, 04 et 05 ; **404** pour 03.
5. Vérifier le résultat attendu : **9 assertions réussies sur 9** pour les cinq requêtes d'origine.

Pour vérifier manuellement le PNG, remplacer temporairement `Accept: image/svg+xml` par `Accept: image/png` dans la requête 04, puis contrôler le statut 200 et l'en-tête `Content-Type: image/png`. L'assertion existante attend toujours du SVG : elle échouera avec cette variante. Rétablir ensuite l'en-tête SVG avant de relancer la collection complète.

Les résultats dépendent de la disponibilité des services externes. Un résultat attendu ne vaut pas preuve d'une nouvelle exécution : conserver un rapport ou une capture si une preuve est nécessaire.

#### Vérifications du socle backend

Ces contrôles techniques sont distincts des requêtes externes de découverte HTTP. Après `npm ci` dans `backend/` :

```bash
npm run build
npm test
```

| Script disponible | Ce qu'il vérifie ou exécute |
|---|---|
| `npm run build` | Compilation NestJS/TypeScript |
| `npm run test:unit` | Un test de compilation du module racine |
| `npm run test:integration` | Recherche de tests d'intégration ; aucun présent, absence acceptée avec `--passWithNoTests` |
| `npm run test:e2e` | Un test HTTP vérifiant `GET /` → 404 |
| `npm test` | Tests unitaires, d'intégration puis end-to-end |

Autres scripts : `start`, `start:dev`, `start:prod`, `test:watch`, `test:cov`, `lint` et `format`. `lint` et `format` peuvent modifier les fichiers ; `start:prod` nécessite une compilation préalable.

Vérifications relancées le **30 octobre 2026** : compilation réussie, **1 test unitaire réussi**, aucun test d’intégration présent et **1 test end-to-end réussi**. Le premier lancement end-to-end a été bloqué par une restriction d’ouverture de port du bac à sable (`listen EPERM`) ; la relance avec autorisation d’ouverture du port local a réussi. Leur portée reste technique : aucun comportement métier, accès PostgreSQL ou contrôle OAuth n’est testé.

### 5.6 Livrables du TP1

| Livrable | Travail réalisé | Emplacement et preuve disponible |
|---|---|---|
| Présentation et suivi du projet | Objectifs, architecture actuelle et progression par TP | [README.md](README.md) |
| Dépôt et environnement | Historique Git, exclusions et socle NestJS/TypeScript | `.gitignore`, `backend/.gitignore`, [backend/](backend/) et historique Git |
| Exploration HTTP | Quatre exercices curl, statuts, extraits et en-têtes expliqués | [docs/http.md](docs/http.md) ; résultats consignés |
| Collection Bruno | Cinq requêtes et neuf assertions automatiques | [bruno/](bruno/) ; rapport d'exécution non versionné |
| Déclaration d'usage de l'IA | Outils utilisés, usages et limites | [IA.md](IA.md) |

Le TP1 a permis de mettre en place un socle reproductible et d'explorer les paramètres, le JSON, les erreurs HTTP et la négociation de contenu. Il ne livre pas encore l'API métier Veillo.

L'ancien README précise que la consigne complémentaire nommant une fonction `consignerPreuvePivot` n'a pas été appliquée, faute de code métier dans ce TP. Cette limite reste déclarée ; aucune fonction artificielle n'a été ajoutée.

## 6. TP2 — Conception de l'API REST

Le travail de conception présent dans le dépôt est regroupé dans [docs/design.md](docs/design.md). Il décrit :

- un MCD de **6 entités et 8 associations**, avec un modèle textuel reproductible dans Mocodo ;
- les choix concernant les patients, soignants, consentements, mesures, seuils et alertes ;
- les règles d'accès aux mesures, de retrait du consentement et de création des alertes ;
- les contraintes de sécurité prévues : scopes OAuth, consentement vérifié à chaque accès, réponses minimales et absence de données de santé dans les logs.

**Il s'agit d'une conception documentée, pas d'une implémentation ni d'une base créée.** Le document recense encore des décisions à prendre : validité des consentements, règles de dépassement, statut et acquittement des alertes, destinataires et liaison des identités OAuth.

Le tableau des 12 endpoints est déclaré dans un Google Docs par `docs/design.md`, mais il n'est pas présent dans le dépôt et n'a pas été vérifié pour cette révision. Le contrat REST reste donc à intégrer à la documentation versionnée.

Livrable actuellement consultable : [docs/design.md](docs/design.md). Les prochains TP pourront être ajoutés sous de nouvelles sections de même niveau, avec leurs réalisations, leurs vérifications et leurs livrables.
