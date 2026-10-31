# Exploration HTTP — TP1

## 1. Objectif

Explorer les échanges HTTP avec curl et des API externes : paramètres, JSON, statuts et négociation de contenu. Ces exercices ne constituent pas une intégration métier de Veillo.

## 2. Requêtes réalisées

Les appels à [httpbin](https://httpbin.org) ont été réalisés avec **curl 8.7.1**, en HTTP/2. Les résultats ci-dessous reprennent les réponses consignées ; ceux de HAPI FHIR proviennent du compte rendu historique Bruno.

### GET avec paramètre

`GET /get?patient=42` sur httpbin a renvoyé **200 OK**. La réponse contient `args.patient` égal à `"42"`, ce qui permet de vérifier la transmission du paramètre dans l’URL.

### POST avec JSON

`POST /post` sur httpbin a renvoyé **200 OK** après l’envoi de `{"frequenceCardiaque":72}` avec `Content-Type: application/json`. Le champ `json` contient l’objet décodé, tandis que `data` conserve le texte envoyé.

### Réponse 404

`GET /status/404` sur httpbin a renvoyé **404 Not Found**, avec un corps vide. Cette route produit volontairement le statut demandé : la requête a atteint le serveur, il ne s’agit pas d’une erreur réseau.

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
- **Statuts** : `200 OK` indique ici une requête réussie ; `404 Not Found` indique une ressource introuvable, simulée volontairement dans cet exercice.
- **Content-Type** : décrit le format du corps. Le GET et le POST JSON retournent `application/json` ; le POST utilise aussi cette valeur pour son corps de requête. La réponse 404 annonce `text/html; charset=utf-8`, malgré l’absence de corps. Les images annoncent respectivement `image/svg+xml` et `image/png`.
- **Content-Length** : taille du corps en octets. Les valeurs consignées sont **233** pour le GET JSON, **25** pour le corps de requête POST, **0** pour la réponse 404 et les tailles SVG/PNG indiquées plus haut.
- **Accept** : format de réponse souhaité, que le serveur peut prendre en compte selon la route.
- **CORS** : le POST retourne `access-control-allow-origin: *`, indiquant que les navigateurs peuvent autoriser les pages de toute origine à lire cette réponse.

## 4. Reproduction

### Avec curl

Prérequis : curl et une connexion Internet. Le backend Veillo n’a pas besoin d’être démarré. L’option `-i` affiche les en-têtes avant le corps.

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
2. Sélectionner [bruno/](../bruno/), qui contient `bruno.json`.
3. Exécuter une requête avec « Send » ou la collection avec « Run Collection ».
4. Consulter les réponses et les résultats des assertions.

La requête [05-fhir-patient.bru](../bruno/05-fhir-patient.bru) appelle `GET https://hapi.fhir.org/baseR4/Patient?_count=1` avec `Accept: application/fhir+json`.

Pour tester le PNG dans la requête 04, remplacer temporairement `Accept` par `image/png`, puis contrôler le statut 200 et `Content-Type: image/png`. L’assertion SVG échouera avec cette variante ; rétablir `Accept: image/svg+xml` avant de relancer la collection.

## 5. Résultats et preuves

**Résultats curl consignés :** les statuts et en-têtes décrits proviennent des réponses httpbin relevées dans le document initial. Les tailles sont historiques et peuvent varier lors d’un nouvel appel. Les anciens extraits JSON étaient raccourcis et l’adresse IP avait été retirée.

**Assertions disponibles dans Bruno :** neuf tests répartis sur cinq requêtes vérifient les statuts, `args.patient === "42"`, `json.frequenceCardiaque === 72`, `Content-Type: image/svg+xml` et `resourceType === "Bundle"` pour HAPI FHIR.

**Résultat historique déclaré :** cinq requêtes et neuf assertions réussies dans Bruno. Les fichiers de requêtes et leurs tests sont versionnés, mais aucun rapport d’exécution ni capture ne confirme ce résultat dans le dépôt.

**Résultat attendu lors d’une nouvelle exécution :** neuf assertions réussies, avec 200 pour les requêtes 01, 02, 04 et 05, et 404 pour la requête 03. Les services externes doivent être disponibles.

**Limite pour le PNG :** sa réponse curl est consignée, mais sa vérification manuelle dans Bruno reste contradictoire entre l’ancien compte rendu et la note de la requête 04. Aucune capture versionnée ne permet de la confirmer ; seul le SVG est testé automatiquement.

Le [README](../README.md#5-tp1--initialisation-et-découverte-http) présente les livrables du TP1. Aucune requête n’a été réexécutée pour cette réorganisation.
