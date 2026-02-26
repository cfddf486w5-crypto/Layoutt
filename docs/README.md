# DL Layout Editor — Pro

Application web offline-first (sans backend) pour éditer un plan d'entrepôt en grille, avec focus PC + iPhone.

## Lancer
1. Ouvrir `index.html` dans un navigateur moderne (Safari iPhone ou desktop).
2. L'application sauvegarde automatiquement les projets en `localStorage` (autosave debounced pour limiter les écritures).
3. Utiliser Export/Import JSON pour backup externe.

## Outils
- Sélection, Pinceau, Gomme, Ligne, Rectangle, Remplissage, Panoramique, Pipette.
- Outil Mesure (distance A→B en cellules + conversion via échelle projet).
- Menu contextuel (clic droit / long-press): dupliquer, supprimer, verrouiller, changer couleur.

## Raccourcis clavier (PC)
- `V` sélection, `B` pinceau, `E` gomme, `L` ligne, `R` rectangle, `F` remplissage, `H` pan, `I` pipette.
- `Ctrl/Cmd + Z` undo.
- `Ctrl/Cmd + Shift + Z` redo.
- `Ctrl/Cmd + Y` redo.
- `Ctrl/Cmd + C` copier sélection.
- `Ctrl/Cmd + V` coller intelligent (offset).
- `Ctrl/Cmd + D` dupliquer.
- `Delete` / `Backspace` supprimer sélection.
- `Ctrl/Cmd + S` sauvegarde locale immédiate.
- `Space` maintenu = pan temporaire.
- `Alt` pendant drag sélection = duplication en glissant.
- Flèches = déplacement précision (Shift+flèche = pas de 5 cellules).
- Boutons `Recentrer` + `Fit` pour recadrer rapidement la vue.

## Gestes iPhone
- Tap: action outil actif.
- Long-press: tooltip + menu contextuel.
- Double-tap sur sélection: zoom centré rapide.
- Pinch: zoom.
- 2 doigts: pan.
- Bouton `Multi`: active la multi-sélection tactile.
- Barre flottante sur sélection: dupliquer, supprimer, rotation, accès propriétés.
- Pad précision: déplacement cellule par cellule.

## Calques / Projet / Versions
- Par calque: visibilité, lock, opacité, ordre haut/bas.
- Solo calque (bouton solo ou Alt+clic sur l’œil).
- Filtre d'affichage par calque.
- Multi-projets: créer, renommer, dupliquer, supprimer.
- Snapshots de versions avec note + restauration.

## Blueprint
- Import image blueprint.
- Opacité, scale, luminosité, contraste.
- Lock blueprint.
- Calibration d'échelle (distance en cellules ↔ distance réelle).

## Export / Import JSON
Le JSON exporté contient:
- `schemaVersion`
- `appVersion`
- `date`
- `projectId`
- `layout`:
  - `gridW`, `gridH`, `cellSize`, `cellRealSize`
  - `cells`, `cellProps`
  - `layerStates`, `layerOrder`, `layerFilter`
  - `favorites`, `recentTiles`
  - `blueprint`
  - `panX`, `panY`, `zoom`
  - `snapshots`

Validation import:
- JSON invalide ou schéma incomplet => message clair, pas de crash.
- Migration de schéma basique appliquée automatiquement (normalisation des champs manquants).

## Export PNG
- Export PNG de la vue actuelle du layout (grille + blueprint + contenu).

## Tests manuels conseillés
1. Vérifier tous les raccourcis clavier outils + undo/redo + copy/paste.
2. Vérifier multi-sélection (Shift+clic + marquee).
3. Vérifier duplication en drag avec `Alt`.
4. Vérifier projets (create/rename/duplicate/delete).
5. Vérifier snapshots (create + restore).
6. Vérifier export/import JSON (schemaVersion conservée).
7. Vérifier export PNG.
8. Vérifier iPhone: pinch zoom, pan 2 doigts, drawers, barre flottante.
