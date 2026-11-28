# Commandes de test — Veillo

Toutes les commandes partent de la racine du dépôt, avec Node.js 22 et les dépendances backend installées. Les scripts sont définis dans [package.json](../../backend/package.json).

## Lancer les suites Jest

Exécuter les suites unitaires, d’intégration et HTTP, dans cet ordre :

```bash
npm --prefix backend test
```

Ce parcours ne lance ni les tests de scripts, ni le contrôle PostgreSQL, ni Schemathesis.

**Tests unitaires** — vérifier les composants isolés :

```bash
npm --prefix backend run test:unit
```

**Intégration Jest** — vérifier les composants assemblés :

```bash
npm --prefix backend run test:integration -- --runInBand
```

**Tests HTTP e2e** — envoyer des requêtes avec Supertest :

```bash
npm --prefix backend run test:e2e
```

Les suites actuelles fonctionnent sans PostgreSQL réel. L’intégration Jest vérifie l’assemblage NestJS avec un double de connexion et découvre les cinq fichiers de tests métier, composés uniquement de TODO :

- [patients.int-spec.ts](../../backend/test/integration/patients.int-spec.ts)
- [measurements.int-spec.ts](../../backend/test/integration/measurements.int-spec.ts)
- [thresholds.int-spec.ts](../../backend/test/integration/thresholds.int-spec.ts)
- [alerts.int-spec.ts](../../backend/test/integration/alerts.int-spec.ts)
- [consents.int-spec.ts](../../backend/test/integration/consents.int-spec.ts)

Les tests métier avec persistance restent à développer selon le [guide d’intégration](integration-testing.md#tests-métier-à-développer).

## Vérifier la découverte et les résultats

Lister les fichiers d’intégration reconnus par Jest, sans exécuter leurs tests :

```bash
npm --prefix backend run test:integration -- --listTests --runInBand
```

Examiner les suites exécutées, les réussites, les échecs et les TODO. `test:integration` utilise `--passWithNoTests` : un code de sortie `0` ne prouve pas qu’un test a été découvert. Un TODO ne valide aucun comportement.

## Cibler un fichier

Vérifier le branchement du validateur de réponses OpenAPI :

```bash
npm --prefix backend run test:e2e -- --runInBand openapi-responses.e2e-spec.ts
```

Sélectionner les tests unitaires du cache, qui restent des TODO :

```bash
npm --prefix backend run test:unit -- --runTestsByPath test/unit/common/cache/etag.util.spec.ts --runInBand
```

## Relancer pendant le développement

Surveiller les modifications et relancer les tests unitaires ; quitter avec `Ctrl+C` :

```bash
npm --prefix backend run test:watch
```

Mesurer la couverture de `src/` par les tests unitaires, avec une sortie dans `backend/coverage/` :

```bash
npm --prefix backend run test:cov
```

Ces deux modes sont configurés dans le projet. Une couverture élevée ne garantit ni les règles métier ni le fonctionnement avec PostgreSQL.

## Tester l’outillage

Exécuter avec Node les tests des scripts de migrations et du registre d’entités, dans des espaces temporaires :

```bash
npm --prefix backend run test:infrastructure
```

Cette suite est distincte de Jest et ne nécessite pas PostgreSQL.

## Contrôler les migrations avec PostgreSQL

**Commande séparée des suites standards.** Elle exige un build préalable, PostgreSQL joignable, les variables de connexion chargées et un utilisateur autorisé à créer une base. L’historique `veillo_migrations` doit exister dans la base de référence pour permettre sa lecture initiale.

```bash
npm --prefix backend run build
npm --prefix backend run test:migrations:postgres
```

Le [script](../../backend/test/integration/persistence/test-migrations-postgres.mjs) crée une base isolée, teste une migration technique temporaire et son retour arrière, puis vérifie les tables et l’historique de la base de référence. Il conserve la base de test et ne valide pas les migrations métier.

Cette commande ne charge pas automatiquement le `.env` racine. La [configuration de connexion](../docker.md) doit être disponible avant son lancement. Aucun contrôle PostgreSQL n’a été exécuté pour cette mise à jour documentaire.

## Tests contractuels et prochaines étapes

Le [guide Schemathesis](../../openapi/schemathesis/schemathesis.md) conserve les commandes propres aux essais contractuels sur Prism et au passage vers le backend réel.

Restent à développer : l’environnement isolé des tests métier, les scénarios d’intégration et leur automatisation en CI. Les [règles d’isolation](integration-testing.md#isoler-et-réinitialiser-les-données) s’appliquent avant toute écriture de test sur le backend.
