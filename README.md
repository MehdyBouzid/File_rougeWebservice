# Veillo — Télésuivi de patients

## 1. Présentation du projet

Veillo est le projet fil rouge du **Mastère 2 Web Services**, **sujet 6 : télésuivi de patients à domicile**. Les montres connectées seront simulées et toutes les données de santé seront fictives.

Les objectifs du projet sont :

- transmettre par lots, toutes les minutes, des mesures de fréquence cardiaque, de SpO₂ et de nombre de pas ;
- gérer des seuils et générer des alertes en cas de dépassement ;
- permettre aux personnes autorisées de consulter les mesures ;
- gérer le consentement des patients et son retrait ;
- authentifier les montres, les patients et les soignants avec OAuth 2.0 et des scopes distincts.

**Ces fonctionnalités sont des objectifs : elles ne sont pas encore implémentées.** Le dépôt contient actuellement un socle backend et des documents de conception. Ce README suit la progression du projet par TP.

## 2. Équipe

- **Mehdy** : Architecture globale, contrats API et développement du backend NestJS/TypeScript.
- **Ethan** : Docker et conteneurisation.
- **Elamine** : Tests d'intégration.
- **Egor** : IoT et développement du simulateur de montres connectées.

## 3. Architecture et technologies

Le simulateur IoT enverra ses mesures à l’API REST NestJS/TypeScript. L’API utilisera PostgreSQL pour les conserver. Une application mobile externe consommera l’API ; **aucun frontend mobile n’est à développer dans ce projet**. Les échanges et les contrats à préciser sont décrits dans [docs/design.md](docs/design.md).

Technologies présentes, selon [backend/package.json](backend/package.json) :

- **Node.js `22.x` et npm** (`.nvmrc` indique `22`).
- **NestJS `^11.0.1`**, avec Express, et **TypeScript `^5.7.3`**.
- **Jest `^30.0.0` et Supertest `^7.0.0`** pour les tests.
- **ESLint `^9.18.0` et Prettier `^3.4.2`** pour la qualité du code.
- **TypeORM et le pilote PostgreSQL `pg`**, ainsi que `class-validator` et `class-transformer` pour la validation des DTO.
- Dépendances complémentaires : `reflect-metadata` (`^0.2.2`) et RxJS (`^7.8.1`).

Ces versions sont les contraintes déclarées, pas un relevé des versions installées. `backend/package-lock.json` verrouille les dépendances utilisées par `npm ci`.

### Démarrer avec Docker

Copier `.env.example` vers `.env` si nécessaire et renseigner `DB_PASSWORD`, puis lancer depuis la racine :

```bash
docker compose up -d --build
```

Le backend utilise par défaut `http://localhost:3000` (`GET /` répond actuellement `404`). Ports, connexion et migrations : [Infrastructure Docker](docs/docker.md).

### État actuel et prochaines étapes

**Présent :** un serveur NestJS avec six modules, Controllers et Services préparatoires, une validation globale et une connexion PostgreSQL via TypeORM. Docker Compose démarre les deux services ; aucune table ni fonctionnalité métier n’est encore implémentée.

**À développer :** le simulateur, la réception des lots, le stockage, la consultation des mesures, les seuils, les alertes, les consentements et le contrôle des accès.

**Choix de conception retenu : OAuth 2.0 avec des jetons d’accès JWT**, avec des scopes distincts pour les montres, les patients et les soignants. Le backend devra vérifier les jetons, les autorisations et le consentement pour les accès concernés. **OAuth 2.0/JWT reste à intégrer**. La connexion PostgreSQL est configurée ; les entités et migrations métier restent à développer. Les options et décisions ouvertes sont détaillées dans [docs/design.md](docs/design.md#7-sécurité).

## 4. Organisation du dépôt

- [backend/](backend/) : API NestJS/TypeScript, configuration et tests. Le dossier `src/features/` contient les six modules ; `test/integration/` est encore vide et `test/e2e/` couvre le serveur HTTP et la validation globale.
- [bruno/](bruno/) : collection de requêtes HTTP et assertions automatiques.
- [docs/](docs/) : exploration HTTP, conception de l’architecture, diagramme REST et modélisation des données.
- [IA.md](IA.md) : déclaration des outils et usages de l'IA, avec leurs limites.
- [README.md](README.md) : présentation du projet, progression par TP et procédures de reproduction.

## 5. TP1 — Initialisation et découverte HTTP

Le TP1 a permis d’apprendre à utiliser une API externe et à comprendre les échanges HTTP avec curl et Bruno.

- [docs/http.md](docs/http.md) : exercices réalisés et notions HTTP abordées.
- [bruno/](bruno/) : requêtes réalisées pour tester les API externes httpbin et HAPI FHIR.
- [IA.md](IA.md) : déclaration de l’utilisation de l’IA.

## 6. TP2 — Conception de l'API REST

Les livrables du TP2 sont :

- **Endpoints et méthodes HTTP** : [docs/api.md](docs/api.md)
- **Réponses HTTP** : [docs/api-review.md](docs/api-review.md)
- **Diagramme REST** : [Voir le diagramme REST de Veillo](docs/images/Capture%20d%E2%80%99e%CC%81cran%202026-10-31%20a%CC%80%2020.37.52.png)
- **MCD — Conception de la base de données** : [Voir le MCD de Veillo](docs/images/mcd-veillo.png)

Consigne complémentaire du support de cours : fonction principale `nommerRessourcePilote`, référence à la note interne **NC-102**. Cette mention ne correspond pas à une fonction actuellement implémentée ; la nécessité de son implémentation reste à vérifier dans le support.

## 7. TP3 — Contrat OpenAPI

Les livrables du TP3 sont :

- **Contrat OpenAPI** : [openapi/openapi.yaml](openapi/openapi.yaml)
- **Outillage TP3** : [docs/outillage-tp3.md](docs/outillage-tp3.md)
- **Mock Prism** : [docs/mock-prism.md](docs/mock-prism.md)
- **Capture du mock** : [docs/mock.png](docs/mock.png)

Flux : `openapi.yaml → Spectral → Prism → Bruno`

## 8. TP4 — Implémentation de l'API REST

Le TP4 porte sur l’implémentation du backend NestJS à partir du contrat OpenAPI et des règles métier définies.

- **Choix techniques** : [CHOIX_TECHNIQUES.md](CHOIX_TECHNIQUES.md)
- **Docker et migrations TypeORM** : [docs/docker.md](docs/docker.md)
