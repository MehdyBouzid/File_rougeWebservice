# Mesures — Entity TypeORM

[measurement.entity.ts](measurement.entity.ts) est une classe préparatoire, sans colonnes ni décorateur TypeORM. Elle n’est pas enregistrée dans le modèle persistant.

Définir les propriétés, la clé primaire et les relations à partir du modèle validé, puis ajouter `@Entity()`. La connexion PostgreSQL est configurée ; le [registre automatique](../../../../README.md#enregistrement-des-entités) reconnaît les imports nommés de décorateurs depuis `typeorm`.

Les formats HTTP restent dans les DTO et les règles métier dans le Service. Référence fonctionnelle : [Mesures](../../../../../openapi/measurements/guide.md).
