# Accès aux données

Une fois l’entité et la connexion configurées, injecter le repository TypeORM dans le Service avec `@InjectRepository`.
Un repository personnalisé est facultatif : le créer uniquement pour des accès spécifiques, sans y placer les règles métier.
Le `.gitkeep` est conservé : aucun besoin spécifique ne justifie encore une classe.
