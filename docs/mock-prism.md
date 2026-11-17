# Mock de l'API Veillo avec Prism

Ce guide explique comment installer et lancer **Prism**, le serveur de mock de Stoplight, à partir du contrat `openapi.yaml`. Prism lit le contrat et simule l'API : il valide les requêtes et renvoie des réponses construites à partir des schémas et des exemples. Le front-end et le client Bruno peuvent donc être testés avant que le back-end NestJS existe.

```powershell
npx @stoplight/prism-cli mock openapi.yaml
```

---

## 1. Prérequis

| Outil | Version | Vérification |
|---|---|---|
| Node.js | 22 (LTS) | `node -v` |
| npm (fourni avec Node.js) | 10 ou plus | `npm -v` |
| `npx` (fourni avec npm) | — | `npx -v` |

### Installer Node.js (si besoin)

1. Télécharger l'installeur **LTS** sur <https://nodejs.org/>.
2. Lancer l'installeur et garder les options par défaut (npm et l'ajout au `PATH` sont cochés).
3. **Fermer puis rouvrir** le terminal pour qu'il prenne en compte le nouveau `PATH`.
4. Vérifier :

```powershell
node -v   # v22.x.x
npm -v    # 10.x.x
```

Autre possibilité sous Windows : `winget install OpenJS.NodeJS.LTS`.

### Windows : erreur « l'exécution de scripts est désactivée »

Sous PowerShell, `npx` est un script `npx.ps1`. Si PowerShell le bloque (`npx.ps1 cannot be loaded because running scripts is disabled on this system`), autoriser les scripts locaux pour l'utilisateur courant :

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Sinon, on peut appeler `npx.cmd` à la place de `npx`.

---

## 2. Installation de Prism

Deux options. **La première est recommandée** : aucune installation globale n'est nécessaire.

### Option A — via `npx` (recommandée)

Rien à installer. Au premier lancement, `npx` télécharge `@stoplight/prism-cli` dans son cache et demande une confirmation :

```
Need to install the following packages:
@stoplight/prism-cli@5.x.x
Ok to proceed? (y)
```

Répondre `y`. Les lancements suivants utilisent le cache et sont immédiats. Pour sauter la question : `npx --yes @stoplight/prism-cli mock openapi.yaml`.

Pour vérifier la version avec cette option :

```powershell
npx @stoplight/prism-cli --version   # ex. 5.14.2
```

> ⚠️ La commande `prism --version` seule ne fonctionne **que si Prism est installé globalement** (option B). Avec `npx`, la commande `prism` n'est pas ajoutée au `PATH`, et PowerShell répond `prism : Le terme « prism » n'est pas reconnu…`.

### Option B — installation globale

```powershell
npm install -g @stoplight/prism-cli
prism --version
```

La commande devient alors simplement `prism mock openapi.yaml`.

---

## 3. Lancer le mock

Se placer **à la racine du dépôt**, là où se trouve `openapi.yaml` :

```powershell
npx @stoplight/prism-cli mock openapi.yaml
```

Prism affiche la liste des routes simulées, puis l'adresse du serveur :

```
[09:26:55] » [CLI] i  info      POST       http://127.0.0.1:4010/measurements
[09:26:55] » [CLI] i  info      GET        http://127.0.0.1:4010/patients
...
[09:26:55] » [CLI] ►  start     Prism is listening on http://127.0.0.1:4010
```

Le mock répond sur **<http://127.0.0.1:4010>**. Le terminal reste occupé tant que Prism tourne ; chaque requête reçue y est journalisée.

**Arrêter le mock :** `Ctrl + C` dans le terminal.

### Options utiles

| Option | Effet | Exemple |
|---|---|---|
| `-p`, `--port` | Change le port (défaut `4010`) | `npx @stoplight/prism-cli mock openapi.yaml -p 8080` |
| `-h`, `--host` | Change l'interface d'écoute (défaut `127.0.0.1`) | `... -h 0.0.0.0` (accessible depuis le réseau local) |
| `-d`, `--dynamic` | Génère des données aléatoires à partir des schémas au lieu d'utiliser les exemples | `npx @stoplight/prism-cli mock openapi.yaml -d` |
| `--errors` | Transforme les violations de la requête en erreurs plutôt qu'en simples avertissements | `... --errors` |

Le contrat est relu automatiquement : si `openapi.yaml` est modifié pendant que Prism tourne, le mock se met à jour sans redémarrage.

---

## 4. Tester le mock avec Bruno

Toutes les routes sont protégées par OAuth 2.0 : chaque requête doit envoyer un en-tête `Authorization: Bearer <jeton>`. Prism vérifie seulement que l'en-tête est présent, **n'importe quelle valeur convient**. Sans cet en-tête, Prism répond **401**. Dans la collection Bruno, ce jeton factice est déjà fourni par la variable `{{token}}` de l'environnement `mock`.

La collection Bruno est déjà configurée pour le mock (`bruno/environments/mock.bru`, `baseUrl = http://127.0.0.1:4010`). On peut l'exécuter de deux façons : avec **le logiciel Bruno** (interface graphique, option A) ou **en ligne de commande** (option B). Dans les deux cas, **Prism doit être lancé** dans un terminal (section 3).

### Les tests intégrés aux requêtes

Chaque requête de `bruno/tp3-mock/` contient un bloc `tests { … }` : des assertions JavaScript (syntaxe Chai, `expect(...)`) que Bruno exécute automatiquement après avoir reçu la réponse.

| Requête | Tests vérifiés |
|---|---|
| `01 GET /patients (mock)` | `statut 200` ; `réponse paginée` (le corps contient `items` et `pagination`) |
| `02 POST /patients/{patientId}/seuils (mock)` | `statut 201` ; `en-tête Location présent` |
| `03 POST /measurements corps invalide (mock)` | `statut 400 (corps rejeté par Prism)` ; `format problem+json` (`Content-Type` contient `application/problem+json`) |

### Option A — avec le logiciel Bruno (interface graphique)

#### 1. Installer Bruno

```powershell
winget install Bruno.Bruno
```

Sinon, on peut télécharger l'installeur sur <https://www.usebruno.com/downloads>. La documentation a été rédigée avec Bruno **v4.3.0** (version affichée en bas à droite de la fenêtre).

#### 2. Ouvrir la collection Veillo

1. Lancer Bruno.
2. Dans le panneau **Collections** (à gauche), cliquer sur **⋮** puis **Open Collection** (ou *Ouvrir une collection*).
3. Sélectionner le dossier **`bruno/`** du dépôt (`C:\Users\Nahte\File_rougeWebservice\bruno`).
4. La collection **Veillo** apparaît dans la liste. En la dépliant, on voit :
   - le dossier **`tp3-mock`**, avec les trois requêtes du mock : `01 GET /patients (mock)`, `02 POST /patients/{patientId}/seuils (mock)` et `03 POST /measurements corps invalide (mock)` ;
   - les requêtes des TP précédents (`01 GET avec parametre`, `02 POST avec JSON`, `03 Erreur 404`, etc.). Elles n'utilisent pas le mock.

À ouvrir une seule fois : Bruno garde ensuite la collection dans son espace de travail (*My Workspace*).

#### 3. Sélectionner l'environnement `mock`

En haut à droite, dans la liste déroulante des environnements, choisir **`mock`**. Cette étape remplace `{{baseUrl}}` par `http://127.0.0.1:4010` et `{{token}}` par le jeton factice.

> Si l'environnement affiché est *No Environment*, les variables `{{baseUrl}}` et `{{token}}` restent vides et les requêtes échouent.

#### 4. Envoyer une requête

1. Cliquer sur une requête du dossier `tp3-mock`, par exemple **`01 GET /patients (mock)`**. L'URL affichée est `{{baseUrl}}/patients?page=0&size=10`.
2. Onglet **Auth** (panneau de gauche) : vérifier que le type est **Bearer Token** et que le champ *Token* contient `{{token}}`. Le jeton est donc envoyé automatiquement, il n'y a rien à saisir.
3. Cliquer sur **Send** (bouton jaune, ou `Ctrl + Entrée`).

#### 5. Lire la réponse et les tests

Le panneau de droite affiche le statut (par exemple **`200 OK`**), la durée et la taille de la réponse, avec quatre onglets :

| Onglet | Contenu |
|---|---|
| **Response** | Corps JSON renvoyé par Prism |
| **Headers** | En-têtes de la réponse (`content-type`, `location`, `sl-violations`…) |
| **Timeline** | Détail de la requête réellement envoyée (URL résolue, en-tête `Authorization`…) |
| **Tests** | Résultat des tests : vert = réussi, rouge = échoué. Le chiffre en exposant (`Tests²`) indique le nombre de tests |

Dans le panneau de gauche, l'onglet **Tests** permet de lire ou de modifier le code des assertions.

#### 6. Lancer tout le dossier d'un coup

Clic droit (ou **⋯**) sur le dossier **`tp3-mock`** → **Run**, puis **Run Collection**. Bruno exécute les trois requêtes dans l'ordre et affiche un résumé : 3 requêtes réussies, 6 tests sur 6.

### Option B — en ligne de commande

Prism étant lancé dans un premier terminal, ouvrir un second terminal :

```powershell
cd bruno
npx @usebruno/cli run tp3-mock --env mock
```

Résultat obtenu :

```
tp3-mock\01-lister-patients (200 OK)
   ✓ statut 200
   ✓ réponse paginée
tp3-mock\02-creer-seuil (201 Created)
   ✓ statut 201
   ✓ en-tête Location présent
tp3-mock\03-lot-invalide (400 Bad Request)
   ✓ statut 400 (corps rejeté par Prism)
   ✓ format problem+json

Status : ✓ PASS   Requests : 3 (3 Passed)   Tests : 6/6
```

Si Prism tourne sur un autre port, on peut changer l'URL sans modifier l'environnement :

```powershell
npx @usebruno/cli run tp3-mock --env mock --env-var baseUrl=http://127.0.0.1:4011
```

Si toutes les requêtes échouent avec `connect ECONNREFUSED 127.0.0.1:4010`, c'est que Prism n'est pas lancé, ou qu'il écoute sur un autre port.

Voir `docs/outillage-tp3.md` pour le détail des requêtes et des résultats attendus.

---

## 5. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `'npx' n'est pas reconnu…` | Node.js absent ou `PATH` pas à jour | Installer Node.js, puis rouvrir le terminal |
| `npx.ps1 cannot be loaded…` | Politique d'exécution PowerShell | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, ou utiliser `npx.cmd` |
| `ENOENT … openapi.yaml` / fichier introuvable | Commande lancée depuis le mauvais dossier | Se placer à la racine du dépôt (`cd C:\Users\Nahte\File_rougeWebservice`) |
| `EADDRINUSE: address already in use 127.0.0.1:4010` | Un autre Prism (ou une autre appli) utilise déjà le port | Fermer l'autre instance, ou lancer avec `-p 4011` |
| Toutes les requêtes renvoient **401** | Jeton absent : environnement `mock` non sélectionné ou onglet **Auth** vide | Sélectionner l'environnement `mock` en haut à droite de Bruno ; vérifier *Auth* → *Bearer Token* = `{{token}}` |
| Réponse **400/422** inattendue | La requête ne respecte pas le contrat | Lire l'en-tête `sl-violations` (onglet **Headers** de la réponse dans Bruno) et le journal de Prism |
| Erreur de parsing au démarrage | `openapi.yaml` invalide | Lancer `npx @stoplight/spectral-cli lint openapi.yaml` pour localiser l'erreur |
| Téléchargement bloqué / proxy | Réseau d'entreprise ou d'école | Configurer `npm config set proxy …`, ou installer Prism globalement depuis un autre réseau |
