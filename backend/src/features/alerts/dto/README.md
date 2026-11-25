# Alertes — DTO

[alert-update.dto.ts](alert-update.dto.ts) prépare les données reçues par `PATCH /alerts/{alertId}`. Compléter ses champs et décorateurs selon le [contrat Alertes](../../../../../openapi/alerts/guide.md), sans copier automatiquement l’Entity.

Le `ValidationPipe` global est déjà activé. Les règles métier restent dans le Service ; le DTO porte les contraintes de structure des entrées.

[Validation et couches backend](../../../../README.md#validation-des-entrées).
