# Mesures — DTO

[measurement-batch.dto.ts](measurement-batch.dto.ts) prépare les données reçues par `POST /measurements`. Compléter ses champs et décorateurs selon le [contrat Mesures](../../../../../openapi/measurements/guide.md), sans copier automatiquement l’Entity.

Le `ValidationPipe` global est déjà activé. Les règles métier restent dans le Service ; le DTO porte les contraintes de structure des entrées.

[Validation et couches backend](../../../../README.md#validation-des-entrées).
