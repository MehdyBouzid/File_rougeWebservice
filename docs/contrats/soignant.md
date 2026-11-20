# Soignant — Décision V1

## Rôle dans le modèle

L’entité `SOIGNANT` représente le professionnel qui suit les patients. Le [MCD](../design.md#4-modélisation-des-données) décrit trois associations :

- `SUIVRE` : relie le soignant aux patients suivis.
- `CONCERNER` : relie un consentement au soignant concerné ; `DONNER` le rattache au patient.
- `RECEVOIR` : relie les alertes à leurs destinataires. Leur sélection reste à préciser.

## Décision V1

Aucun JSON, schéma OpenAPI ou endpoint REST dédié à `Soignant` n’est prévu en V1. Les [opérations actuelles](../api.md) répondent au besoin d’accéder aux données des patients suivis ; aucun besoin de consultation des profils de soignants n’est défini.

Le soignant reste donc une entité métier et un appelant authentifié. Les échanges existants peuvent référencer son identifiant, sans exposer son profil.

## Conséquences pour le backend

Le backend devra identifier le soignant authentifié, vérifier son jeton JWT, ses autorisations et le suivi du patient concerné, même sans endpoint dédié.

Un consentement valide est exigé pour consulter les mesures et le détail d’une alerte. Son contrôle pour les autres consultations et actions reste à valider, selon la [revue des réponses HTTP](../api-review.md) et la [conception](../design.md#périmètre-du-contrôle-du-consentement).

Le lien entre l’identité OAuth et l’entité `SOIGNANT` reste à définir. Ces exigences ne signifient pas que la sécurité est déjà implémentée.

## Évolution possible : afficher le soignant d'un patient

Si l'application mobile doit afficher l'identité du soignant qui suit un patient, un contrat JSON dédié pourra être ajouté.

**Exemple illustratif de réponse JSON, à valider :**

```json
{
"id": "7e9f0a21-8c34-4d65-9a72-5b2f6e810c43",
"nom": "Martin",
"prenom": "Sophie"
}
```

**Pourquoi ces champs ?**

- `id` : identifier le soignant.
- `nom` et `prenom` : afficher son identité.

Seules les données utiles à cette fonctionnalité sont exposées, conformément au principe de minimisation des données.

Cet exemple illustre une évolution possible, pas une fonctionnalité à développer.
