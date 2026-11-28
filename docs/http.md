# Exploration HTTP — TP1

## 1. Objectif

Exercices du TP1 avec curl et deux API externes : httpbin et HAPI FHIR. Ils explorent HTTP ; ils ne font pas partie de l’API métier Veillo.

## 2. Requêtes réalisées

Les appels à [httpbin](https://httpbin.org) ont été réalisés avec **curl 8.7.1**, en HTTP/2. Les résultats ci-dessous reprennent les réponses consignées ; ceux de HAPI FHIR proviennent du compte rendu historique Bruno.

### GET avec paramètre

`GET /get?patient=42` sur httpbin a renvoyé **200 OK**. `args.patient` vaut `"42"` : le serveur a reçu le paramètre de l’URL.

### POST avec JSON

`POST /post` sur httpbin a renvoyé **200 OK** après l’envoi de `{"frequenceCardiaque":72}` avec `Content-Type: application/json`. Le champ `json` contient l’objet décodé, tandis que `data` conserve le texte envoyé.

### Réponse 404

`GET /status/404` sur httpbin a renvoyé **404 Not Found**, avec un corps vide. La route simule volontairement ce statut ; le serveur a bien reçu la requête.

### Négociation de contenu

`GET /image` sur httpbin a renvoyé **200 OK** pour les deux valeurs de `Accept` testées :

- `image/svg+xml` : réponse SVG de **8984 octets**.
- `image/png` : réponse PNG de **8090 octets**.

La même URL fournit une représentation différente selon le format demandé. À l’inverse, `https://httpbin.org/xml` renvoie du XML quel que soit `Accept` et n’illustre donc pas cette négociation.

### Requête HAPI FHIR

La collection Bruno interroge aussi `GET /baseR4/Patient?_count=1` sur le serveur public HAPI FHIR, avec `Accept: application/fhir+json`. Le compte rendu historique déclare une réponse **200 OK**, et la collection vérifie `resourceType === "Bundle"`.

FHIR est un standard d’échange de données de santé. Cet exercice est distinct des appels httpbin et ne constitue pas une intégration FHIR dans Veillo.

## 3. Notions HTTP

- **GET et POST** : les GET lisent ici une ressource sans envoyer de corps ; le POST transmet un corps JSON.
- **Paramètres** : après `?`, ils apportent des informations au serveur, comme `patient=42` ou `_count=1`.
- **JSON** : format de données composé notamment d’objets, de tableaux et de valeurs. Le POST envoie ici l’objet `{"frequenceCardiaque":72}`, que httpbin décode dans sa réponse.
- **Statuts** : `200 OK` indique ici une requête réussie ; `404 Not Found` indique une ressource introuvable, simulée volontairement dans cet exercice.
- **Content-Type** : décrit le format du corps. Le GET et le POST JSON retournent `application/json` ; le POST utilise aussi cette valeur pour son corps de requête. La réponse 404 annonce `text/html; charset=utf-8`, malgré l’absence de corps. Les images annoncent respectivement `image/svg+xml` et `image/png`.
- **Content-Length** : taille du corps en octets. Les valeurs consignées sont **233** pour le GET JSON, **25** pour le corps de requête POST, **0** pour la réponse 404 et les tailles SVG/PNG indiquées plus haut.
- **Accept** : format de réponse souhaité, que le serveur peut prendre en compte selon la route.
- **CORS** : le POST retourne `access-control-allow-origin: *`, indiquant que les navigateurs peuvent autoriser les pages de toute origine à lire cette réponse.

## 4. Reproduction

### Avec curl

Il faut curl et Internet, sans démarrer Veillo. `-i` affiche les en-têtes avant le corps.

```bash
curl -i 'https://httpbin.org/get?patient=42'

curl -i -X POST 'https://httpbin.org/post' \
  -H 'Content-Type: application/json' \
  -d '{"frequenceCardiaque":72}'

curl -i 'https://httpbin.org/status/404'

curl -i 'https://httpbin.org/image' -H 'Accept: image/svg+xml'
curl -i 'https://httpbin.org/image' -H 'Accept: image/png'
```

Le dernier appel renvoie un corps PNG binaire. Pour consulter uniquement les en-têtes, ajouter `-o /dev/null` à la commande.

### Avec Bruno

1. Ouvrir Bruno et choisir « Open Collection ».
2. Sélectionner [bruno/](../bruno/), qui contient [bruno.json](../bruno/bruno.json), puis lancer les cinq requêtes TP1 à la racine de la collection. Le sous-dossier `tp3-mock/` concerne Veillo et nécessite Prism.
3. Exécuter une requête avec « Send » ; sélectionner uniquement les requêtes TP1 pour un lancement groupé.
4. Consulter les réponses et les résultats des assertions.

La requête [05-fhir-patient.bru](../bruno/05-fhir-patient.bru) appelle `GET https://hapi.fhir.org/baseR4/Patient?_count=1` avec `Accept: application/fhir+json`.

Pour tester le PNG dans la requête 04, remplacer temporairement `Accept` par `image/png`, puis contrôler le statut 200 et `Content-Type: image/png`. L’assertion SVG échouera avec cette variante ; rétablir `Accept: image/svg+xml` avant de relancer la collection.

## 5. Résultats et preuves

Les résultats curl consignés décrivent les statuts et en-têtes des exercices ci-dessus. Les tailles peuvent varier ; les réponses sont résumées sans adresse IP.

**Bruno :** cinq requêtes et neuf assertions vérifient les statuts, `args.patient === "42"`, `json.frequenceCardiaque === 72`, `Content-Type: image/svg+xml` et `resourceType === "Bundle"` pour HAPI FHIR.

**Résultat attendu :** neuf assertions réussies, avec `200` pour les requêtes 01, 02, 04 et 05, et `404` pour la requête 03. Les services externes doivent être disponibles.

**Portée des preuves :** le compte rendu déclare cinq requêtes et neuf assertions réussies, sans rapport versionné confirmant ce résultat. Les appels n’ont pas été rejoués pour cette révision. Le PNG est consigné avec curl ; sa vérification manuelle dans Bruno n’est pas confirmée, car les comptes rendus se contredisent. Seul le SVG y est testé automatiquement. Les captures [Prism](mock-prism.md#résultats-et-preuves) concernent le TP3.

Le [README](../README.md#5-tp1--initialisation-et-découverte-http) présente les livrables du TP1.
