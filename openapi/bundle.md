# Bundle OpenAPI — Regrouper le contrat

Le [bundle](openapi.bundle.yaml) est une version regroupée du contrat OpenAPI, dans un seul fichier YAML. Certains outils l’utilisent plus facilement que les sources réparties dans plusieurs dossiers.

Les sources restent [openapi.yaml](openapi.yaml) et les fichiers qu’il référence. Leur organisation est décrite dans le [guide d’architecture](architecture-api.md).

```text
Parent + sources référencées → Redocly → openapi.bundle.yaml
```

Redocly suit les `$ref`, les liens entre les définitions, puis regroupe leur contenu. Le bundle peut garder des `$ref` vers des définitions du même fichier.

Les développeurs maintiennent les sources. Redocly produit le bundle à partir de celles-ci.

## Générer et mettre à jour

**Prérequis :** Node.js 22, npm avec `npx` et un terminal ouvert à la racine du dépôt. Le premier téléchargement des outils peut nécessiter un accès réseau.

Régénérer le bundle après chaque modification des sources. Par exemple, après un changement dans le schéma JSON des mesures :

```bash
npx @redocly/cli bundle openapi/openapi.yaml -o openapi/openapi.bundle.yaml
```

**Résultat attendu :** la commande termine sans erreur et met à jour `openapi/openapi.bundle.yaml`.

Si elle signale une `$ref` introuvable, vérifier le chemin et le nom de la définition dans le fichier source. Corriger cette référence avant de continuer.

Puis [lancer Spectral](spectral.md#lancer-les-vérifications). Générer le fichier ne suffit pas à vérifier toutes les règles du contrat ni le comportement du backend.

Le [guide TP3](../docs/outillage-tp3.md#2-documentation-redocly) présente aussi les vérifications Redocly et la génération de la documentation HTML.

**Ne pas modifier le bundle à la main.** Cela créerait un écart avec les sources. La prochaine génération écraserait ces changements.

```text
Modifier les sources → régénérer → valider → relire le diff
```

## Quels outils l’utilisent ?

- **Spectral** vérifie le bundle avec les règles de Veillo : voir le [guide Spectral](spectral.md).
- **NestJS** utilise `express-openapi-validator` pour contrôler les réponses JSON à partir du bundle. Les garanties et limites sont dans le [guide backend](../backend/README.md#validation-openapi-des-réponses).
- **Schemathesis** utilise le bundle dans les commandes documentées pour générer ses tests : voir le [guide de test](schemathesis/schemathesis.md). Des essais sur le parent existent aussi.

**Prism charge directement le parent et ses références** avec la commande actuelle. Il n’a pas besoin du bundle. Bruno envoie ensuite ses requêtes à Prism ; il ne lit pas le contrat.

Redocly utilise également le parent pour le lint et la documentation HTML dans les commandes du projet.

## Disponibilité dans Docker

[compose.yaml](../compose.yaml) rend le bundle accessible dans le conteneur à l’emplacement `/openapi/openapi.bundle.yaml`, en lecture seule.

Le fichier doit exister sur la machine avant le démarrage du backend. Il n’est pas inclus dans l’image Docker seule.

Après un changement du contrat :

```text
Régénérer → valider → redémarrer le backend
```

Le redémarrage recharge le contrat. Mettre à jour le fichier sur disque ne garantit pas que le backend déjà démarré le relise.

Le [guide Docker](../docs/docker.md) décrit les commandes d’utilisation des conteneurs.
