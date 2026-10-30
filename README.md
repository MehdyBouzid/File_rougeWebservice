# Veillo — Télésuivi de patients

Veillo est notre projet fil rouge du Mastère 2 Web Services (**sujet 6 : Télésuivi patient**). L'idée est de suivre à distance des patients à domicile grâce à des montres connectées.

Référence interne du TP1 : note **NC-201**.

## Le projet en bref

Ce que nous visons :

- des montres connectées (simulées) envoient régulièrement des mesures fictives : fréquence cardiaque, saturation en oxygène (SpO₂) et nombre de pas ;
- les mesures sont comparées à des seuils, ce qui permet de détecter une situation nécessitant une alerte et d'avertir les soignants ;
- une API permet aux soignants de consulter les mesures des patients qu'ils suivent ;
- le patient doit avoir donné son consentement pour que ses données soient accessibles.

**Ce sont les objectifs du projet, pas des fonctionnalités déjà implémentées.** La conception (modèle de données, règles, sécurité) est détaillée dans [docs/design.md](docs/design.md).

## Équipe

*Noms et rôles des membres du groupe : à compléter.*

## Technologies

Présentes dans le dépôt (squelette technique dans `backend/`) :

- **NestJS 11** (Express) et **TypeScript**, pour construire l'API REST de façon modulaire ;
- **Node.js 22** et **npm** ;
- **Jest** pour les tests unitaires, d'intégration et end-to-end, avec **Supertest** pour les requêtes HTTP des tests E2E ;
- **ESLint** et **Prettier** pour la qualité du code.

La base de données prévue est PostgreSQL, mais elle n'est pas encore configurée.

Outils utilisés pour le TP1 : curl, l'API publique httpbin, l'application Bruno et l'API publique de test HAPI FHIR.

## Organisation du dépôt

```text
FileRougeM2/
├── backend/               # API NestJS (squelette, aucun code métier pour l'instant)
│   ├── src/
│   │   └── features/      # emplacement des futurs modules métier
│   └── test/
│       ├── integration/   # futurs tests d'intégration
│       └── e2e/           # tests end-to-end
├── bruno/                 # collection Bruno du TP1 (5 requêtes)
├── docs/
│   ├── design.md          # conception : MCD, règles, sécurité
│   └── http.md            # exploration HTTP avec curl (TP1)
├── IA.md                  # déclaration de l'usage de l'IA
└── README.md              # présentation du projet
```

Chaque future fonctionnalité aura son dossier dans `src/features/`, avec des sous-dossiers `controller/`, `service/`, `repository/` et `model/`, et son module NestJS.

## TP1 — Travail réalisé

**Dépôt et environnement.** Le dépôt Git est initialisé sur la branche `main`, avec un dépôt distant `origin` sur GitHub, et un `.gitignore` à la racine en plus de celui du backend. Sur le poste de Mehdy, nous avons vérifié Git 2.39.3, Docker 27.3.1 (`docker run --rm hello-world` fonctionne), Node v22.23.4 et curl 8.7.1. Les postes des autres membres n'ont pas été vérifiés.

**Exploration de HTTP avec curl.** Nous avons envoyé quatre requêtes à httpbin : un GET avec un paramètre de requête, un POST avec un corps JSON et un `Content-Type`, une requête qui renvoie une erreur 404 et une requête avec un en-tête `Accept` différent. Pour chacune, [docs/http.md](docs/http.md) donne la commande, le statut réel et deux en-têtes de réponse expliqués.

**Collection Bruno.** Le dossier [bruno/](bruno/) contient cinq requêtes : les quatre précédentes, plus un GET sur l'API publique HAPI FHIR (`Patient?_count=1`), liée au domaine de la santé. Nous les avons exécutées dans Bruno : 5 requêtes réussies sur 5, et 9 tests automatiques réussis sur 9, sans échec. Les preuves sont des captures d'écran du rapport d'exécution, qui ne sont pas dans le dépôt.

**Négociation de contenu.** La quatrième requête appelle `https://httpbin.org/image` avec `Accept: image/svg+xml` et renvoie bien une image SVG. Avec `Accept: image/png`, une capture Bruno montre une réponse 200 et une image affichée. Avec curl, nous avons relevé le `Content-Type: image/png`, mais nous ne l'avons pas contrôlé dans Bruno. Le test automatique de la requête 04 ne vérifie que le SVG.

Ces exercices nous ont permis de mieux comprendre les méthodes HTTP, les paramètres de requête, les corps JSON, les codes de réponse, les en-têtes et la négociation de contenu.

## Backend NestJS : démarrage et tests

Le backend est pour l'instant un squelette technique sans fonctionnalité métier. Prérequis : Node.js 22 et npm (la version est indiquée dans `backend/.nvmrc`).

```bash
cd backend
npm ci
npm run start:dev    # démarre le serveur en mode watch (port 3000 par défaut)
```

Le serveur ne propose encore aucune route : toute requête renvoie 404. Pour compiler : `npm run build`. Pour lancer sans watch : `npm start`.

### Tests du backend

Trois niveaux de tests sont préparés avec Jest :

```bash
npm run test:unit         # unitaires : fichiers *.spec.ts à côté du code (Jest)
npm run test:integration  # intégration : test/integration/*.int-spec.ts (Jest)
npm run test:e2e          # end-to-end : test/e2e/*.e2e-spec.ts (Jest + Supertest)
npm test                  # les trois à la suite
```

Résultats vérifiés (30 octobre 2026) : `npm run build` réussi, 1 test unitaire réussi, aucun test d'intégration écrit (la commande se termine sans erreur), 1 test E2E réussi, et `npm test` réussi.

Ces tests ne vérifient que le squelette technique (le module de l'application se compile, une route inconnue répond 404). Ils ne testent aucune fonctionnalité métier de Veillo.

## Reproduire les tests Bruno

Les requêtes du TP1 utilisent des API externes (httpbin et HAPI FHIR) : elles ne testent pas encore le backend NestJS, il n'est donc pas nécessaire de le lancer. Il faut en revanche une connexion Internet.

1. Installer et lancer l'application [Bruno](https://www.usebruno.com/).
2. Ouvrir la collection avec « Open Collection » et choisir le dossier `bruno/` (celui qui contient `bruno.json`).
3. Lancer les requêtes une par une avec Send, ou toute la collection avec « Run Collection ».

Résultats attendus : 200 pour les requêtes 01, 02, 04 et 05, 404 pour la requête 03, et 9 tests réussis sur 9. Pour la variante PNG, remplacer `Accept` par `image/png` dans la requête 04 : le test de cette requête attend alors encore du SVG et échouera, c'est normal.

Les commandes curl sont dans [docs/http.md](docs/http.md).

## État actuel et prochaines étapes

**Réalisé :**
- initialisation du dépôt, exploration HTTP, documentation dans `docs/http.md` ;
- collection Bruno exécutée avec succès sur des API publiques ;
- squelette technique du backend NestJS, avec l'organisation des tests Jest préparée et un premier test unitaire et E2E technique.

**Conçu et documenté, pas implémenté :** le modèle de données (six entités, sept associations), les règles de gestion et les contraintes de sécurité, dans [docs/design.md](docs/design.md). Le tableau des 12 endpoints REST est dans notre Google Docs et n'est pas encore dans le dépôt : ce ne sont pas des routes fonctionnelles.

**À développer :** l'API métier NestJS de Veillo n'est pas encore implémentée. Le backend ne contient que le squelette technique. Il reste notamment la base PostgreSQL, les modules métier et leurs endpoints, l'authentification imposée par le sujet, les tests métier et le simulateur de montres.

**À noter :** la consigne complémentaire du TP1 qui nomme une fonction `consignerPreuvePivot` n'a pas été appliquée. Le TP1 ne contient pas de code métier et nous n'avons pas voulu créer une fonction artificielle.

## Utilisation de l'IA

Nous avons utilisé Claude Code ; le détail est dans [IA.md](IA.md).
