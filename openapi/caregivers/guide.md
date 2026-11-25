# Soignant — Décision V1

Le soignant est une entité du modèle métier et un appelant authentifié. En V1, aucun besoin ne justifie d’exposer son profil : **pas de JSON, de schéma OpenAPI ni d’endpoint Soignant dédié**.

## Son rôle dans Veillo

Trois associations du [MCD](../../docs/design.md#4-modélisation-des-données) expliquent sa présence :

- `SUIVRE` relie les soignants aux patients suivis.
- `CONCERNER` rattache un consentement à un soignant ; `DONNER` le rattache au patient.
- `RECEVOIR` relie les alertes à leurs destinataires. Leur sélection reste à préciser.

Les [routes actuelles](../../docs/api.md) servent à consulter ou gérer les données des patients concernés. Elles peuvent référencer l’identifiant du soignant sans exposer son profil ni toutes ses relations.

## Ce que le backend doit vérifier

Même sans endpoint dédié, chaque accès concerné doit identifier le soignant et vérifier ses droits :

```text
jeton absent ou invalide → 401
rôle ou scope insuffisant → 403
patient inexistant ou non suivi → 404
consentement requis mais absent ou retiré → 404
```

Le consentement est explicitement requis pour les mesures et le détail d’une alerte. Son périmètre reste à harmoniser sur les autres opérations : voir la [revue HTTP](../../docs/api-review.md) et la [décision ouverte](../../docs/design.md#périmètre-du-contrôle-du-consentement).

Le lien entre l’identité OAuth et `SOIGNANT` reste à définir. La sécurité métier n’est pas implémentée.

## Si un profil devient nécessaire

Un contrat pourra être ajouté si une fonctionnalité validée doit afficher l’identité d’un soignant. Cet exemple reste une **proposition**, sans route associée :

```json
{
  "id": "7e9f0a21-8c34-4d65-9a72-5b2f6e810c43",
  "nom": "Martin",
  "prenom": "Sophie"
}
```

`id` identifierait le soignant ; `nom` et `prenom` permettraient de l’afficher. Le nom et le format de l’identifiant ne sont pas décidés. Ne renvoyer que les données nécessaires au besoin retenu.
