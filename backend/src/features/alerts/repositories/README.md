# Alertes — Accès aux données

Le [Service](../services/alerts.service.ts) utilise déjà le repository TypeORM standard et des accès via `DataSource`. Aucune classe Repository personnalisée n’est définie ici ; le `.gitkeep` est conservé.

Ajouter une classe seulement si des requêtes spécifiques le justifient. Les règles métier restent dans le Service ; voir les [responsabilités des couches](../../../../architecture-backend.md#modules-et-couches) et le [contrat Alertes](../../../../../openapi/alerts/alerts-contract.md).
