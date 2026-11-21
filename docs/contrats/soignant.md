# Soignant — Décision V1

Le soignant suit des patients et intervient dans leurs consentements et alertes. En V1, il est une entité métier et un appelant authentifié, **sans endpoint dédié**.

## Rôle dans le modèle

L’entité `SOIGNANT` est reliée au reste par trois associations du [MCD](../design.md#4-modélisation-des-données) :

```text
SOIGNANT ──SUIVRE────► PATIENT        patients suivis
SOIGNANT ◄─CONCERNER── CONSENTEMENT   (DONNER le rattache au patient)
SOIGNANT ◄─RECEVOIR──► ALERTE         destinataires, sélection à préciser
```

## Décision V1

Les [opérations actuelles](../api.md) couvrent l’accès aux données des patients suivis. Aucun besoin d’afficher les profils Soignant n’est défini : pas de JSON, schéma OpenAPI ou route dédiée. Les échanges peuvent simplement référencer son identifiant.

## Conséquences pour le backend

Même sans endpoint dédié, le backend devra :

- identifier le soignant et vérifier son jeton JWT et son scope soignant (`403` si le scope est insuffisant) ;
- vérifier qu’il suit le patient concerné (`404` si le patient est inexistant ou non suivi par le soignant) ;
- exiger un consentement valide pour consulter les mesures et le détail d’une alerte ; son absence ou son retrait place l’objet hors du périmètre (`404`).

Le consentement reste à harmoniser sur les autres opérations : voir la [revue HTTP](../api-review.md) et le [point à arbitrer](../design.md#périmètre-du-contrôle-du-consentement). Le lien OAuth–`SOIGNANT` reste à définir ; la sécurité métier n’est pas implémentée.

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

`id` identifie le soignant ; `nom` et `prenom` affichent son identité. Cet exemple reste une proposition : aucun profil ni nouvelle route n’est à développer sans besoin validé. Limiter alors la réponse aux données utiles.
