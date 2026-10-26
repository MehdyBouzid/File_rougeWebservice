# features/

Ce dossier accueille les fonctionnalités métier de l'application.

## Principe

L'application est organisée **par fonctionnalité** (feature-based) : chaque fonctionnalité
métier vit dans son propre sous-dossier de `features/`, avec tout ce dont elle a besoin
(pages, composants, services, modules de routing, etc.), plutôt que de répartir le code par
type technique (tous les services ensemble, toutes les pages ensemble...).

```text
features/
└── ma-fonctionnalite/
    └── ... pages, composants, services, module(s)
```

## Convention

- Un dossier par fonctionnalité, nommé en `kebab-case`.
- Le découpage interne d'une fonctionnalité est laissé à l'équipe frontend.
- Le projet utilise des NgModules (pas de composants standalone) : une fonctionnalité
  expose généralement un module chargé en lazy loading depuis `app-routing.module.ts`.
