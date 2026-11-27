# Soignants — Entity TypeORM

[caregiver.entity.ts](caregiver.entity.ts) décrit la table persistée et porte déjà les décorateurs TypeORM. La classe `Caregiver` est enregistrée dans le [registre des entités](../../../../README.md#enregistrement-des-entités).

Avant de faire évoluer les colonnes ou relations, comparer l’Entity au [modèle validé](../../../../../docs/design.md#4-modélisation-des-données) et aux [migrations](../../../../src/persistence/migrations/). L’enregistrement d’une classe ne crée pas sa table et ne prouve pas que le SQL est appliqué.

Le [guide Soignants](../../../../../openapi/caregivers/caregivers-contract.md) décrit les échanges HTTP ; ils ne doivent pas être déduits automatiquement de l’Entity.
