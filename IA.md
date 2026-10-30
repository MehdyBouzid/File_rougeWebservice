# Usage de l'IA

Ce fichier déclare comment nous avons utilisé L IA sur Veillo, et ce que nous en faisons. Il décrit l'usage de l'outil ci-dessous dans ce dépôt. Si d'autres membres du groupe utilisent d'autres outils, ils vont les ajouter

## 1. Outils utilisés

- **Claude**

## 2. Utilisations de l'IA

### Compréhension et apprentissage

- expliquer des notions techniques ;
- clarifier des concepts mal compris ;
- comprendre le fonctionnement des technologies utilisées.

### Conception et choix techniques

Nous avons surtout utilisé l'IA pour relire et vérifier la conception de notre base de données. Nous proposons d'abord notre MCD et nos raisonnements, puis nous demandons à l'IA de les examiner de façon critique : discuter nos choix de modélisation et leurs avantages et inconvénients, vérifier la cohérence des entités, des associations et des cardinalités, repérer des incohérences ou des règles métier oubliées, et voir si le modèle semble exploitable pour la future base de données et l'API. Ses remarques nous servent à confronter notre raisonnement et à mieux comprendre nos choix.

Les réponses de l'IA sont des avis et des pistes de vérification, pas une preuve que le MCD est correct. L'IA n'a pas conçu ni validé définitivement notre modèle : les décisions finales sont prises par l'équipe et doivent respecter le sujet du formateur. Le développement de la base de données et de l'API n'a pas encore commencé.

### Documentation

- aide à la rédaction et à la structuration des documents Markdown (`README.md`, `docs/design.md`, `docs/http.md`) ;
- amélioration de la clarté, de la cohérence et de la lisibilité ;
- reformulation et organisation d'informations que nous avions déjà.

### Développement et vérification

Claude Code a été utilisé pour :

- installer et initialiser le projet backend NestJS, sans code métier ;
- mettre en place l'architecture de dossiers du projet ;
- pour le TP1 : vérifier les outils et exécuter les requêtes curl de l'exploration HTTP, créer la collection `bruno/` et le `.gitignore` racine.

## 3. Limites et vérification

- Les réponses de l'IA peuvent contenir des erreurs : nous les relisons et nous les vérifions.
- Nous n'utilisons une proposition que si nous l'avons comprise.
- Les décisions de conception, les décisions métier et le MCD restent sous la notre responsabilité
- Les documents officiels du formateur restent la référence pour les exigences du projet.
