# Soignant — Décision V1

Le soignant est le professionnel qui suit les patients. En V1, il n’a **pas d’endpoint dédié** : il est un appelant authentifié et une entité du modèle.

## Rôle dans le modèle

L’entité `SOIGNANT` est reliée au reste par trois associations du [MCD](../design.md#4-modélisation-des-données) :

```text
SOIGNANT ──SUIVRE────► PATIENT        patients suivis
SOIGNANT ◄─CONCERNER── CONSENTEMENT   (DONNER le rattache au patient)
SOIGNANT ◄─RECEVOIR──► ALERTE         destinataires, sélection à préciser
```

## Décision V1

Aucun JSON, schéma OpenAPI ni endpoint REST n’est prévu pour `Soignant`. Les [opérations actuelles](../api.md) suffisent pour accéder aux données des patients suivis, et aucun besoin de consulter des profils de soignants n’est défini. Les échanges peuvent référencer son identifiant sans exposer son profil.

## Conséquences pour le backend

Même sans endpoint dédié, le backend devra :

- identifier le soignant et vérifier son jeton JWT et son scope soignant (`403` si le scope est insuffisant) ;
- vérifier qu’il suit le patient concerné (`404` si le patient est inexistant ou non suivi par le soignant) ;
- exiger un consentement valide pour consulter les mesures et le détail d’une alerte ; son absence ou son retrait place l’objet hors du périmètre (`404`).

Le contrôle du consentement pour les autres consultations et actions reste à valider, selon la [revue des réponses HTTP](../api-review.md) et la [conception](../design.md#périmètre-du-contrôle-du-consentement). Le lien entre l’identité OAuth et l’entité `SOIGNANT` reste à définir. Rien de cela n’est implémenté.

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
