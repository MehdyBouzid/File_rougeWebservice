# Télésuivi de patients

Fil rouge du Mastère 2 Web Services : application de télésuivi de patients équipés de montres connectées (simulées).

Le dépôt contient pour l'instant uniquement l'initialisation technique des deux applications.

## Structure

```text
FileRougeM2/
├── backend/   # API Java / Spring Boot (Maven)
├── front/     # Application Ionic / Angular / Capacitor
├── README.md
└── IA.md
```

## Technologies

| Partie   | Technologies |
|----------|--------------|
| Backend  | Java 21, Spring Boot 4.1, Maven (wrapper), Spring Web MVC, Spring Data JPA, Spring Security, Validation, driver PostgreSQL |
| Frontend | Angular 21.2.25, Ionic 9, Capacitor 8 |

## Prérequis

- JDK 21
- Node.js 22.23.4 (version fixée dans `front/.nvmrc`, gérée avec nvm) et npm
- Maven n'a pas besoin d'être installé : le projet fournit `./mvnw`
- Une base PostgreSQL (configuration non encore réalisée)

## Démarrage

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

> La connexion à PostgreSQL n'est pas encore configurée : le démarrage et le test `contextLoads` échouent tant qu'aucune datasource n'est définie.

### Frontend

```bash
cd front
nvm use          # utilise la version de front/.nvmrc (22.23.4)
npm install
npm start        # ou : ionic serve
npm run build    # build de production dans www/
```
