# Mesures — DTO

[measurement-batch.dto.ts](measurement-batch.dto.ts) valide le lot et ses relevés. [list-measurements-query.dto.ts](list-measurements-query.dto.ts) traite la période et la pagination ; [measurement-response.dto.ts](measurement-response.dto.ts) décrit les réponses dans le code.

Le [contrat Mesures](../../../../../openapi/measurements/measurements-contract.md) reste la référence des échanges. Certains contrôles du DTO sont plus stricts que le YAML ; ces écarts restent à arbitrer, selon le [guide backend](../../../../README.md#validation-openapi-des-réponses).

L’atomicité, les doublons et l’autorisation sur le patient relèvent du Service, pas du DTO.
