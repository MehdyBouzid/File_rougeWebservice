# Exploration HTTP avec curl

TP1 — prise en main des outils. Les requêtes ci-dessous ont été exécutées avec `curl 8.7.1` sur l'API publique [httpbin](https://httpbin.org), le 30 octobre 2026. Les codes et les en-têtes viennent des réponses réelles. Les corps de réponse sont raccourcis, et l'adresse IP renvoyée par httpbin a été retirée.

L'option `-i` de curl affiche les en-têtes de la réponse avant le corps. Toutes les réponses sont en HTTP/2.

## 1. GET avec paramètre de requête

```bash
curl -i 'https://httpbin.org/get?patient=42'
```

**Statut : `200 OK`.**

Extrait du corps :

```json
{
  "args": { "patient": "42" },
  "headers": { "Accept": "*/*", "Host": "httpbin.org", "User-Agent": "curl/8.7.1" },
  "method": "GET",
  "url": "https://httpbin.org/get?patient=42"
}
```

En-têtes de réponse expliqués :

- `content-type: application/json` : le corps est du JSON. Le client sait ainsi comment l'interpréter.
- `content-length: 233` : taille du corps en octets.

Le paramètre `patient=42` placé après le `?` arrive côté serveur dans l'objet `args`. Il ne modifie pas la ressource demandée : il la précise.

## 2. POST avec corps JSON et `Content-Type`

```bash
curl -i -X POST 'https://httpbin.org/post' \
  -H 'Content-Type: application/json' \
  -d '{"frequenceCardiaque":72}'
```

**Statut : `200 OK`.**

Extrait du corps :

```json
{
  "data": "{\"frequenceCardiaque\":72}",
  "headers": { "Content-Length": "25", "Content-Type": "application/json" },
  "json": { "frequenceCardiaque": 72 },
  "method": "POST"
}
```

En-têtes de réponse expliqués :

- `content-type: application/json` : la réponse est aussi du JSON.
- `access-control-allow-origin: *` : en-tête CORS. Il autorise une page web de n'importe quelle origine à lire cette réponse depuis un navigateur.

Sans l'en-tête de requête `Content-Type: application/json`, le serveur ne saurait pas que le corps est du JSON. Ici, il le confirme : le champ `json` contient l'objet déjà décodé.

## 3. Requête qui renvoie 404

```bash
curl -i 'https://httpbin.org/status/404'
```

**Statut : `404 Not Found`.**

La route `/status/{code}` de httpbin renvoie le code demandé. Le corps est vide.

En-têtes de réponse expliqués :

- `content-length: 0` : le corps est vide, ce qui est cohérent avec une erreur sans détail.
- `content-type: text/html; charset=utf-8` : type annoncé malgré l'absence de contenu. Un serveur réel renverrait en général ici un message d'erreur.

Un `404` signifie que la ressource demandée n'existe pas. Ce n'est pas une erreur de réseau : la requête a bien abouti.

## 4. Requête avec un en-tête `Accept` différent

L'en-tête `Accept` indique au serveur le format de réponse souhaité. La route `/image` de httpbin en tient compte.

```bash
curl -i 'https://httpbin.org/image' -H 'Accept: image/svg+xml'
curl -i 'https://httpbin.org/image' -H 'Accept: image/png'
```

**Statut : `200 OK` dans les deux cas.**

| `Accept` envoyé | `content-type` reçu | `content-length` |
|---|---|---|
| `image/svg+xml` | `image/svg+xml` | 8984 |
| `image/png` | `image/png` | 8090 |

En-têtes de réponse expliqués :

- `content-type` : le format réellement renvoyé. Il change avec l'`Accept` demandé.
- `content-length` : la taille change aussi (8984 contre 8090 octets), car ce sont deux fichiers différents.

C'est de la négociation de contenu : même URL, représentation différente selon l'`Accept`.

Toutes les routes ne se comportent pas ainsi. `https://httpbin.org/xml` renvoie toujours du XML, quel que soit l'`Accept` : c'est pourquoi nous ne l'utilisons pas pour illustrer ce point.

## Cinquième requête (domaine du projet)

La cinquième requête de la collection Bruno cible le serveur public de test HAPI FHIR, qui expose le standard FHIR pour les données de santé. Elle est décrite dans `bruno/` ; elle ne fait pas partie de l'exploration httpbin ci-dessus.

## Rejouer ces requêtes

Les mêmes requêtes sont disponibles dans la collection `bruno/` du dépôt.
