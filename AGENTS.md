# Instructions agent (repo Layout-)

## Structure attendue
- `index.html`: shell UI.
- `style.css`: styles dark/mobile-first.
- `app.js`: logique complète offline.
- `data/tileCatalog.js`: catalogue tuiles.
- `assets/icons/*.svg`: icônes monochromes.
- `docs/README.md`: guide utilisateur + tests manuels.

## Règles de dev
- Application 100% offline (aucune dépendance externe).
- Pas de framework ni build step.
- Préserver compatibilité iPhone Safari + desktop.
- Toute persistance via localStorage et export/import JSON.
- Garder le code lisible et commenté brièvement.

## Validation rapide
- Ouvrir `index.html`.
- Vérifier outils d'édition + pan/zoom + undo/redo.
- Vérifier export/import JSON et export PNG.
