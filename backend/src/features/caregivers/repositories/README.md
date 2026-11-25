# Soignants — Accès aux données

Utiliser d’abord le repository standard TypeORM, injecté dans le Service avec `@InjectRepository` lorsque l’Entity sera définie et enregistrée.

Un repository lit et écrit les données ; il ne décide ni des autorisations ni des règles métier. Une classe personnalisée est utile seulement pour des requêtes spécifiques.

Le `.gitkeep` est conservé : aucun besoin spécifique ne justifie encore une classe. Voir le [raccordement TypeORM](../../../../README.md#enregistrement-des-entités) et le [contrat Soignants](../../../../../openapi/caregivers/guide.md).
