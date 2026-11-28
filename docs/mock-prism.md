# Mock de l’API Veillo avec Prism

Prism simule les réponses OpenAPI sans lancer NestJS. Utiliser ce mock pour préparer les échanges des clients et tester les requêtes Bruno ; il ne remplace pas les tests du backend.

Le [guide d’outillage](outillage-tp3.md) donne les commandes de génération et de lint. Ce document couvre le démarrage, les requêtes Bruno, le dépannage et les preuves de tests du mock. L’[architecture OpenAPI](../openapi/architecture-api.md) explique les fichiers sources.

## 1. Prérequis

- Node.js **22**, selon [backend/.nvmrc](../backend/.nvmrc), avec npm 10 ou plus et `npx`.
- Un accès réseau au premier téléchargement des outils.
- Le dépôt ouvert à sa racine.

```powershell
node -v
npm -v
npx -v
```

Si nécessaire, installer Node.js **22** depuis <https://nodejs.org/>, puis rouvrir le terminal. Choisir cette version du projet plutôt que la dernière LTS disponible.

## 2. Utiliser Prism

Avec `npx`, aucune installation globale n’est nécessaire. Le premier lancement peut demander de télécharger l’outil.

```powershell
npx @stoplight/prism-cli --version
```

## 3. Lancer le mock

Depuis la racine du dépôt, utiliser le [fichier parent](../openapi/openapi.yaml). Il charge les `paths/` et composants de chaque ressource, ainsi que les définitions transversales : voir l’[architecture des contrats](../openapi/architecture-api.md).

```powershell
npx @stoplight/prism-cli mock openapi/openapi.yaml
```

Prism doit annoncer **13 opérations**, puis `http://127.0.0.1:4010`. Le terminal reste occupé ; `Ctrl+C` arrête le mock.

Options utiles :

- `-p 4011` : autre port. Adapter aussi `baseUrl` dans Bruno.
- `-h 0.0.0.0` : écouter hors de la boucle locale, notamment pour Docker ; le mock peut alors être accessible depuis le réseau.
- `-d` : générer des valeurs depuis les schémas au lieu des exemples.
- `--errors` : produire une réponse d’erreur pour les violations de requête ou de réponse classées comme erreurs.

Exemple sur un autre port :

```powershell
npx @stoplight/prism-cli mock openapi/openapi.yaml -p 4011
```

Après une modification des sources, [régénérer et valider le bundle](../openapi/bundle.md#générer-et-mettre-à-jour), puis redémarrer Prism pour charger la version voulue.

## 4. Tester le mock avec Bruno

`Contrat validé → Prism lancé → environnement mock → requêtes Bruno`.

Le contrat actuel déclare Bearer/JWT, avec OAuth prévu. Prism accepte un jeton factice : il ne contrôle ni sa signature, ni les scopes, ni les droits métier. Sans l’en-tête `Authorization: Bearer …`, il répond `401`.

### Avec l’interface Bruno

Sous Windows, installer Bruno si nécessaire :

```powershell
winget install Bruno.Bruno
```

Bruno est aussi disponible sur <https://www.usebruno.com/downloads>.

1. Ouvrir la collection [bruno/](../bruno/) avec **Open Collection**.
2. Sélectionner l’environnement **mock**, défini dans [mock.bru](../bruno/environments/mock.bru).
3. Ouvrir une des **sept requêtes** de [tp3-mock/](../bruno/tp3-mock/), distinctes des exercices TP1.
4. Dans **Auth**, vérifier **Bearer Token** et `{{token}}`, puis cliquer sur **Send**.
5. Lire **Response** (JSON), **Headers** (notamment `Content-Type`, `Location`, `sl-violations`), **Timeline** (requête envoyée) et **Tests** (assertions).

L’environnement fournit `baseUrl`, `patientId`, `seuilId` et `token`. Avec **No Environment**, les variables restent non résolues. Pour lancer le dossier : clic droit sur `tp3-mock` → **Run / Run Collection**.

Chaque fichier contient ses assertions dans `tests { … }`. Les cas sont détaillés ci-dessous ; un test rouge peut révéler une hypothèse du test plutôt qu’un défaut du contrat.

### Ce que couvrent les requêtes actuelles

- **01 — Patients :** attend `200` et les propriétés `items` et `pagination`. Cette enveloppe reste ouverte dans le contrat ; ces assertions sont une hypothèse du test.
- **02 — Création d’un seuil :** attend `201`, `Location` et les six champs de `Threshold`, avec `actif: true`.
- **03 — Lot invalide :** attend `400` car `patientId` manque. La note du fichier sur un UUID obligatoire et une SpO₂ limitée à 100 est obsolète : ces contraintes ne sont pas définies.
- **04 à 07 — PATCH d’un seuil :** attendent `200` pour le corps valide, puis `400` pour un corps vide, une valeur nulle et une propriété inconnue.

**Limite actuelle :** les quatre PATCH n’envoient pas `If-Match`. Ils explorent les schémas du mock et ne valident pas le parcours conditionnel prévu, où cet en-tête est exigé et son absence donne `428`.

Pour comprendre un rejet Prism, lire `sl-violations`. Les exemples d’erreur sont fictifs : leur `detail` ne remplace pas le diagnostic attendu du backend. Voir les [limites du mock](#résultats-et-preuves).

### En ligne de commande

Avec Prism lancé, ouvrir un second terminal depuis la racine :

```powershell
cd bruno
npx @usebruno/cli run tp3-mock --env mock
```

Depuis `bruno/`, remplacer l’URL pour un mock sur le port 4011 :

```powershell
npx @usebruno/cli run tp3-mock --env mock --env-var baseUrl=http://127.0.0.1:4011
```

## 5. Dépannage

- **`npx` introuvable :** vérifier Node.js 22 et le `PATH`, puis rouvrir le terminal.
- **PowerShell bloque `npx.ps1` :** utiliser `npx.cmd` à la place de `npx`.
- **`ENOENT` / contrat introuvable :** partir de la racine et utiliser `openapi/openapi.yaml`.
- **`EADDRINUSE` :** choisir un autre port avec `-p` et adapter `baseUrl`.
- **`ECONNREFUSED` :** Prism est arrêté ou l’URL/port de Bruno est incorrect.
- **`401` :** vérifier l’environnement `mock` et l’en-tête Bearer.
- **`400/422` inattendu :** lire `sl-violations` et les logs. Le contrat Veillo prévoit `400` pour ses validations ; le comportement d’un outil ne redéfinit pas ces codes.
- **Erreur de parsing :** suivre les [commandes de génération](../openapi/bundle.md#générer-et-mettre-à-jour) puis les [diagnostics Spectral](../openapi/spectral.md#comprendre-et-corriger-un-résultat).
- **Téléchargement bloqué :** vérifier le proxy npm et les règles réseau du poste.

## Résultats et preuves

Les résultats ci-dessous proviennent d’essais déjà consignés, non rejoués pour ce nettoyage. Ils portent sur Prism, pas sur la persistance, les transactions, le consentement ou la sécurité du backend.

- **Prism :** 77 échanges identiques avant et après le découpage par ressource : succès, erreurs forcées et création de seuil invalide.
- **Schemathesis 4.33.4 :** 13 opérations et 159 cas réussis sur chacune des deux entrées, parent et bundle. Phases `examples,coverage`, mode positif, options `--max-examples 1 --max-time 40 --seed 20261125` et [trois exclusions propres au mock](../openapi/schemathesis/schemathesis.md#premier-essai-avec-prism). Le fuzzing et les tests à état n’ont pas été exécutés.
- **Bruno :** contrôle ciblé des seuils consigné avec 5 requêtes et 11 assertions réussies. Ce résultat précède les schémas actuels des relevés et alertes ; il ne valide pas la collection complète actuelle.

**Captures du TP3 — 3 requêtes et 6 assertions réussies :**

- [Liste des patients](images/capture_bruno1.png).
- [Création d’un seuil](images/capture_bruno2.png).
- [Lot invalide](images/capture_bruno3.png).

Ces preuves ne définissent pas le contrat actuel : elles montrent `id` au lieu de `seuilId`, une enveloppe Patients non validée et un ancien message sur la SpO₂.

Les [vérifications statiques](outillage-tp3.md#vérifications-consignées) complètent ces essais. Aucun de ces résultats ne garantit la conformité de toutes les évolutions suivantes du contrat.

### Écarts HTTP observés

Avec Prism 5.14.2 :

- JSON mal formé : `400 application/json`, au lieu du format d’erreur cible.
- Méthode non définie : `405` sans `Allow`.
- Média de requête non prévu : `400`.

Ces limites du mock ne changent pas la [politique HTTP](api-review.md) attendue de NestJS. Le [guide Schemathesis](../openapi/schemathesis/schemathesis.md#limites-observées-sur-prism) précise leurs conséquences sur les tests.
