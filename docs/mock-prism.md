# Mock de l’API Veillo avec Prism

Prism simule les réponses OpenAPI sans lancer NestJS. Utiliser ce mock pour préparer les échanges des clients et tester les requêtes Bruno ; il ne remplace pas les tests du backend.

Le [guide d’outillage](outillage-tp3.md) explique l’architecture, la validation et les résultats par requête. Ici : installation, démarrage, utilisation et dépannage.

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

### Windows : scripts PowerShell bloqués

Si `npx.ps1` est bloqué, appeler `npx.cmd` à la place de `npx`. Autre option, si la politique du poste le permet :

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## 2. Installation de Prism

Avec `npx`, aucune installation globale n’est nécessaire. Au premier lancement, accepter le téléchargement demandé ; les suivants utilisent l’installation disponible ou le cache npm.

```powershell
npx @stoplight/prism-cli --version
```

Les essais historiques utilisaient Prism **5.14.2**. Pour accepter automatiquement le téléchargement :

```powershell
npx --yes @stoplight/prism-cli mock openapi/openapi.yaml
```

**Option globale**, seulement si souhaitée :

```powershell
npm install -g @stoplight/prism-cli
prism --version
prism mock openapi/openapi.yaml
```

Sans installation globale, `prism` seul peut être introuvable : garder la commande `npx`.

## 3. Lancer le mock

Depuis la racine du dépôt, utiliser le [fichier parent](../openapi/openapi.yaml), qui charge aussi `paths/` et `components/` :

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

Après une modification des sources, [régénérer et valider le bundle](outillage-tp3.md#1-génération-du-bundle-et-validation-spectral), puis redémarrer Prism pour charger la version voulue.

## 4. Tester le mock avec Bruno

`Contrat validé → Prism lancé → environnement mock → requêtes Bruno`.

Le contrat actuel déclare Bearer/JWT, avec OAuth prévu. Prism accepte un jeton factice : il ne contrôle ni sa signature, ni les scopes, ni les droits métier. Sans l’en-tête `Authorization: Bearer …`, il répond `401`.

### Avec l’interface Bruno

Sous Windows, installer Bruno si nécessaire :

```powershell
winget install Bruno.Bruno
```

Autre accès : <https://www.usebruno.com/downloads>. Le guide initial utilisait Bruno **4.3.0** ; les libellés d’interface peuvent varier.

1. Ouvrir la collection [bruno/](../bruno/) avec **Open Collection**.
2. Sélectionner l’environnement **mock**, défini dans [mock.bru](../bruno/environments/mock.bru).
3. Ouvrir une des **sept requêtes** de [tp3-mock/](../bruno/tp3-mock/), distinctes des exercices TP1.
4. Dans **Auth**, vérifier **Bearer Token** et `{{token}}`, puis cliquer sur **Send**.
5. Lire **Response** (JSON), **Headers** (notamment `Content-Type`, `Location`, `sl-violations`), **Timeline** (requête envoyée) et **Tests** (assertions).

L’environnement fournit `baseUrl`, `patientId`, `seuilId` et `token`. Avec **No Environment**, les variables restent non résolues. Pour lancer le dossier : clic droit sur `tp3-mock` → **Run / Run Collection**.

Chaque fichier contient ses assertions dans `tests { … }`. Les cas et leurs limites sont décrits dans le [guide d’outillage](outillage-tp3.md#4-client-bruno) ; un test rouge peut révéler une hypothèse du test plutôt qu’un défaut du contrat.

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
- **PowerShell bloque `npx.ps1` :** utiliser `npx.cmd` ou la procédure de la section 1.
- **`ENOENT` / contrat introuvable :** partir de la racine et utiliser `openapi/openapi.yaml`.
- **`EADDRINUSE` :** choisir un autre port avec `-p` et adapter `baseUrl`.
- **`ECONNREFUSED` :** Prism est arrêté ou l’URL/port de Bruno est incorrect.
- **`401` :** vérifier l’environnement `mock` et l’en-tête Bearer.
- **`400/422` inattendu :** lire `sl-violations` et les logs. Le contrat Veillo prévoit `400` pour ses validations ; le comportement d’un outil ne redéfinit pas ces codes.
- **Erreur de parsing :** suivre les [commandes de validation](outillage-tp3.md#1-génération-du-bundle-et-validation-spectral), en utilisant le bundle pour Spectral.
- **Téléchargement bloqué :** vérifier le proxy npm et les règles réseau du poste ; l’installation globale reste une option.

## Résultats et preuves

L’ancien compte rendu annonçait **3 requêtes réussies et 6 tests sur 6**, avec les statuts `200`, `201` et `400`. Ce résultat ne couvre pas les sept requêtes actuelles.

Captures disponibles :

- [Liste des patients](images/capture_bruno1.png) : `200` et une ancienne enveloppe `items/pagination`.
- [Création d’un seuil](images/capture_bruno2.png) : `201` et une ancienne réponse avec `id`.
- [Lot invalide](images/capture_bruno3.png) : `400` et un ancien exemple d’erreur sur la SpO₂.

Ces images sont des **preuves historiques**, pas le contrat actuel : le seuil utilise désormais `seuilId`, et ni l’enveloppe Patients ni la limite de SpO₂ à 100 ne sont validées par ces captures. Le fichier attendu `docs/mock.png` est absent.

Prism vérifie les schémas, pas la persistance, les transactions, l’unicité, le consentement ou les contrôles d’accès. Les réponses forcées et les exemples statiques ne prouvent pas l’implémentation métier. Voir les [écarts techniques observés](api-review.md#contrat-mock-et-backend). Aucun nouvel essai HTTP n’a été exécuté pendant cette révision.
