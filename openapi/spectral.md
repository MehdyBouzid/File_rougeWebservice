# Spectral — Vérifier le contrat OpenAPI

Spectral vérifie le contrat OpenAPI sans lancer le backend. Ce contrôle, appelé **lint**, repère les erreurs dans les fichiers et les écarts aux règles de Veillo.

L’utiliser après une modification du contrat, avant de le partager ou de lancer les mocks.

Il ne teste ni le comportement du backend, ni les droits d’accès, ni les règles métier à l’exécution.

## Configuration du projet

[.spectral.yaml](.spectral.yaml) indique les règles à appliquer. Il reprend les règles OpenAPI de `spectral:oas` et ajoute celles de Veillo :

- `operation-operationId` : chaque opération possède un identifiant.
- `security-roles-known` : seuls les noms provisoires `montre`, `patient` et `soignant` sont acceptés.
- Les `401` déclarent `WWW-Authenticate` obligatoire.
- Les `201` déclarent `Location`.
- Les erreurs visées par la règle utilisent `application/problem+json` : `400`, `401`, `403`, `404`, `409`, `412` et `428`.

Ces contrôles portent sur les déclarations YAML, pas sur les headers réellement envoyés par NestJS.

La règle standard `oas3-operation-security-defined` est désactivée. Elle attend des scopes OAuth, alors que le contrat utilise encore Bearer avec des rôles OpenAPI 3.1.

La règle locale `security-roles-known` vérifie seulement les trois noms autorisés. Elle ne valide ni OAuth ni les permissions réelles.

## Lancer les vérifications

**Prérequis :** Node.js 22, npm avec `npx` et un terminal ouvert à la racine du dépôt. Le premier téléchargement des outils peut nécessiter un accès réseau.

Après une modification des sources, [régénérer le bundle](bundle.md#générer-et-mettre-à-jour), puis lancer :

```bash
npx @stoplight/spectral-cli lint openapi/openapi.bundle.yaml --ruleset openapi/.spectral.yaml
```

Spectral vérifie le bundle avec la configuration actuelle. Cela évite le rejet des références externes utilisées dans les chemins du fichier parent. Le contrat peut donc rester organisé en plusieurs fichiers sources.

**Résultat attendu :** 0 erreur. Examiner aussi les avertissements. Ne pas désactiver une règle pour masquer un problème.

## Comprendre et corriger un résultat

Chaque message indique où se trouve le problème, sa gravité et la règle concernée.

1. Lire la règle et retrouver l’opération ou le composant signalé.
2. Si la position concerne le bundle, retrouver sa définition source avec le [guide d’architecture](architecture-api.md#quel-fichier-modifier-).
3. Corriger le fichier source, régénérer le bundle, puis relancer Spectral.

Exemples :

- `operation-operationId` : une opération n’a pas d’identifiant.
- `created-responses-have-location` : une réponse `201` ne déclare pas le header `Location`.

Corriger selon les décisions du contrat. Si une valeur ou un comportement reste à décider, demander sa validation avant de l’ajouter.

Les [résultats déjà consignés](../docs/outillage-tp3.md#vérifications-consignées) indiquent le périmètre des validations passées. Relancer le lint après chaque modification.
