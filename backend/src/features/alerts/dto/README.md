# Alertes — DTO

[alert-update.dto.ts](alert-update.dto.ts) valide le statut reçu par le PATCH. [list-alerts-query.dto.ts](list-alerts-query.dto.ts) traite les filtres ; [alert-response.dto.ts](alert-response.dto.ts) décrit les réponses dans le code.

Comparer toute évolution au [contrat Alertes](../../../../../openapi/alerts/alerts-contract.md). Les types des réponses ne valident pas seuls le JSON à l’exécution : voir la [validation HTTP du backend](../../../../README.md#validation-openapi-des-réponses).

Les DTO portent la structure des échanges. Les transitions et les droits d’accès restent dans les traitements métier.
