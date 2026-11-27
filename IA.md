# Usage de l’IA

Nous utilisons l’IA pour mieux comprendre les notions du cours, confronter nos choix et améliorer les documents de Veillo. Elle nous accompagne dans le travail ; les décisions restent celles de l’équipe.

## Outils utilisés

- **Claude**
- **Claude Code**
- **Codex**

Cette liste pourra être complétée si d’autres outils sont utilisés par les membres du groupe.

## Apprentissage

Nous demandons à l’IA d’expliquer des notions techniques, de clarifier les concepts que nous comprenons mal et de nous aider à comprendre le fonctionnement des technologies utilisées.

## Conception

Nous lui soumettons notre MCD et nos raisonnements pour obtenir une relecture critique. Cela nous aide à :

- vérifier la cohérence des entités, des associations et des cardinalités ;
- repérer des incohérences ou des règles métier oubliées ;
- discuter les avantages et les limites de nos choix de modélisation ;
- examiner si le modèle convient à la future base de données et à l’API.

Ses remarques nous permettent de confronter notre raisonnement. Elles ne prouvent pas que le MCD est correct et ne remplacent pas notre validation du modèle. Ce travail porte sur la conception, pas sur une base de données ou une API métier déjà développées.

## Documentation

L’IA nous aide à rédiger et à structurer le [README](README.md), la [conception](docs/design.md), les [exercices HTTP](docs/http.md) et l’[architecture des contrats](openapi/architecture-api.md).

Nous l’utilisons pour reformuler les informations que nous avons déjà, mieux les organiser et améliorer la clarté et la cohérence des documents.

Codex a aussi participé aux relectures des contrats et à l’harmonisation des Markdown du dépôt. Les décisions ouvertes et les résultats historiques sont conservés ; une reformulation ne vaut pas validation métier ni preuve de test.

Codex a réorganisé les sources OpenAPI et déplacé les guides par ressource, selon l’architecture validée. Les références, liens et documents de navigation ont été actualisés ; la comparaison du contrat assemblé et les validations sont distinguées des tests du backend métier.

## Développement

### Initialisation et TP1

Claude Code a été utilisé pour :

- installer et initialiser le backend NestJS, sans code métier ;
- organiser les dossiers du projet ;
- vérifier les outils et l’environnement du TP1 ;
- exécuter les commandes curl de l’exploration HTTP ;
- créer la collection Bruno dans `bruno/` et le `.gitignore` à la racine.

### Préparation du backend

L’IA a été utilisée pour préparer la structure technique du backend NestJS : création des modules, organisation des dossiers, configuration des dépendances et installation de TypeORM.

Elle a également aidé à automatiser certaines configurations et à ajouter des commentaires pédagogiques pour faciliter la compréhension du code.

**La conception des fonctionnalités, la logique métier et leur implémentation restent à la charge des développeurs.**

### Migrations et vérifications techniques

Codex a aidé à traduire le MPD fourni en SQL dans les migrations Patients, Seuils et Consentements, sans générer les Entities métier. Il a exécuté la migration Seuils seule, puis vérifié la table et son historique dans PostgreSQL ; Consentements est restée bloquée par l’absence de Soignant lors de ce contrôle.

Cette assistance technique ne remplace pas la relecture du SQL ni les tests métier. Les vérifications et résultats doivent être distingués des fonctionnalités simplement préparées.

### Validation contractuelle des réponses

Codex a branché `express-openapi-validator` sur le bundle OpenAPI, avec la configuration native validée par Mehdy. La validation des requêtes et de la sécurité reste désactivée ; les DTO, le ValidationPipe, les filtres et les règles métier sont conservés. Des tests HTTP techniques vérifient le comportement du branchement sans implémenter les fonctionnalités de l’équipe.

Le premier essai a exécuté 16 tests ciblés et la suite existante, puis vérifié le branchement dans un conteneur temporaire sans accès PostgreSQL. Ces contrôles ne garantissent ni les headers sortants, ni l’ordre des contrôles métier, ni les autorisations.

## Vérification et responsabilité

Les réponses de l’IA peuvent contenir des erreurs. Nous les relisons et les vérifions, et nous ne retenons une proposition que si nous l’avons comprise.

Les choix techniques, le MCD et les décisions métier restent sous la responsabilité de l’équipe. Les consignes et les documents officiels du formateur restent notre référence.
