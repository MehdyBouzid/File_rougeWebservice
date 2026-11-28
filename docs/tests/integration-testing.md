# Tests d’intégration — TP5

Les tests d’intégration vérifient que plusieurs composants fonctionnent ensemble. Dans Veillo, les futurs tests métier doivent relier les requêtes HTTP, les Services et PostgreSQL pour détecter les erreurs que des composants isolés ne révèlent pas.

## Où développer ?

Écrire les tests dans [backend/test/integration/](../../backend/test/integration/), avec un fichier `*.int-spec.ts` par ressource.

### Tests métier à développer

Cinq fichiers préparent les scénarios. Ils contiennent uniquement des commentaires et des `it.todo`, sans application de test ni accès à la base.

| Fichier | Scénarios préparés | Contrat à suivre |
| --- | --- | --- |
| [patients.int-spec.ts](../../backend/test/integration/patients.int-spec.ts) | Liste et détail des patients. | [Patients](../../openapi/patients/patients-contract.md) |
| [measurements.int-spec.ts](../../backend/test/integration/measurements.int-spec.ts) | Ingestion des lots et consultation des mesures. | [Mesures](../../openapi/measurements/measurements-contract.md) |
| [thresholds.int-spec.ts](../../backend/test/integration/thresholds.int-spec.ts) | Liste, création, lecture et modification des seuils, avec le cache HTTP. | [Seuils](../../openapi/thresholds/thresholds-contract.md) et [cache](../../openapi/cache/cache-contract.md) |
| [alerts.int-spec.ts](../../backend/test/integration/alerts.int-spec.ts) | Création après dépassement, consultation et traitement des alertes. | [Alertes](../../openapi/alerts/alerts-contract.md) |
| [consents.int-spec.ts](../../backend/test/integration/consents.int-spec.ts) | Consultation et retrait des consentements. | [Consentements](../../openapi/consents/consents-contract.md) |

Les routes non codées, les JSON encore ouverts et le périmètre du consentement doivent être finalisés avant de valider les scénarios concernés. L’en-tête de chaque fichier signale des points ouverts à ne pas figer dans les assertions. Les TODO ne constituent pas des tests réussis.

### Autres tests de ce dossier

- [app.module.int-spec.ts](../../backend/test/integration/app.module.int-spec.ts) vérifie l’assemblage NestJS avec un double de connexion, sans PostgreSQL réel.
- [scripts/](../../backend/test/integration/scripts/) teste l’outillage avec des fichiers temporaires, via Node.
- [test-migrations-postgres.mjs](../../backend/test/integration/persistence/test-migrations-postgres.mjs) contrôle les migrations dans une base isolée. Ce script séparé ne teste pas les endpoints métier.

Les [tests unitaires](../../backend/test/unit/) vérifient les composants isolés. Les [tests e2e existants](../../backend/test/e2e/) vérifient les échanges HTTP techniques, sans persistance réelle.

## Quels comportements vérifier ?

Prévoir **au moins un cas nominal et un cas négatif par endpoint implémenté**. Partir des [règles métier](../design.md#6-règles-métier) et des [contrats par ressource](../../openapi/architecture-api.md#se-repérer), sans inventer les formats encore ouverts.

Routes actuellement codées, à couvrir en premier (les scénarios Patients, Seuils et Consentements attendent leurs routes) :

- **`POST /measurements`** : enregistrement du lot ; rejet d’un lot invalide ou d’un `batchId` déjà reçu. Vérifier l’atomicité et l’absence d’écriture supplémentaire lors d’un rejet.
- **`GET /patients/{patientId}/measurements`** : lecture des données préparées ; paramètres invalides ou patient inaccessible selon les contrôles raccordés.
- **`GET /alerts`** : liste conforme aux données et filtres préparés ; filtre invalide. Vérifier que les filtres n’élargissent jamais les droits.
- **`GET /alerts/{alertId}`** : détail d’une alerte ; identifiant inexistant ou objet inaccessible.
- **`PATCH /alerts/{alertId}`** : passage à `TRAITEE` ; statut invalide ou alerte déjà traitée, selon le contrat et les décisions restant à valider.

Pour chaque cas, vérifier le statut HTTP, le type de contenu, les champs JSON définis et les effets en base. Pour une erreur, vérifier `application/problem+json`, les propriétés obligatoires de `Problem` et la correspondance entre `status` et le statut HTTP.

Vérifier aussi les headers exigés par l’opération. Le validateur de réponses ne les garantit pas tous ; voir ses [limites](../../backend/README.md#validation-openapi-des-réponses).

Les contrôles JWT, scopes, suivi et consentement doivent être testés lorsqu’ils seront raccordés. Ne pas considérer leur absence actuelle comme un succès de sécurité. Signaler les écarts au contrat au lieu d’assouplir les assertions pour obtenir un résultat vert.

## Isoler et réinitialiser les données

**Utiliser une base PostgreSQL réservée aux tests, avec des données fictives.** Le Compose habituel cible la base de développement ; il ne fournit pas encore l’environnement isolé des tests métier.

Le développeur devra préparer le parcours suivant :

```text
Vérifier la base cible → appliquer les migrations validées
→ préparer les données fictives → exécuter le cas → nettoyer les données de test
```

- Vérifier la connexion et l’identité de la base avant toute écriture ou réinitialisation. Refuser de continuer si la cible n’est pas explicitement réservée aux tests.
- Préparer un état connu pour chaque cas : patient, relations et données nécessaires, sans dépendre de l’ordre des tests.
- Nettoyer uniquement les données de la base de test, en respectant les clés étrangères, puis restaurer les données de départ du cas suivant.
- Fermer l’application et les connexions après la suite, même en cas d’échec.

La méthode de nettoyage reste à implémenter. Un rollback ne suffit que si toutes les écritures du cas utilisent la même transaction ; une requête HTTP peut utiliser une autre connexion.

Ne jamais réinitialiser la base de développement ni supprimer ses volumes pour tester. Le mode séquentiel réduit les conflits entre suites, mais ne remplace pas l’isolation.

## Exécuter les tests

Suivre les [commandes de test](test-commands.md#lancer-les-suites-jest) pour lancer l’intégration et [vérifier les fichiers découverts](test-commands.md#vérifier-la-découverte-et-les-résultats).

Ces commandes ne configurent pas de base de test. Pour les futurs scénarios métier, préparer d’abord la connexion isolée et les données décrites ci-dessus. Un test technique réussi ne prouve pas le fonctionnement avec PostgreSQL réel.

## Ce qui reste à implémenter

- Le démarrage de l’application de test avec PostgreSQL isolé, les migrations et les données fictives.
- La réinitialisation fiable entre les cas et la protection contre une mauvaise base cible.
- Les cas nominaux et négatifs des endpoints, puis les contrôles d’accès lorsqu’ils seront disponibles.
- L’automatisation dans la CI et la conservation des résultats réels, avec les commandes, la couverture exercée et les limites.

Le [guide Schemathesis](../../openapi/schemathesis/schemathesis.md) complète ces tests par des requêtes générées depuis OpenAPI. Réutiliser le même principe d’isolation avant tout test contractuel avec écriture sur le backend réel.
