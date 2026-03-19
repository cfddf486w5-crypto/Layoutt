# DL Layout Editor — Pro

Application web offline-first (sans backend) pour éditer un plan d'entrepôt en grille, avec focus PC + iPhone et installation PWA.

## Lancer
1. Ouvrir `index.html` dans un navigateur moderne (Safari iPhone ou desktop) ou servir le dossier en HTTP local pour activer le service worker PWA.
2. L'application sauvegarde automatiquement les projets en `localStorage` (autosave debounced pour limiter les écritures).
3. Utiliser Export/Import JSON pour backup externe.

## PWA iPhone / mobile
- Meta tags iPhone ajoutés: mode standalone, status bar translucide, icônes Apple + thème sombre.
- Bannière d'aide intégrée: sur iPhone, elle rappelle `Partager -> Ajouter à l'écran d'accueil`; sur navigateurs compatibles, elle expose le bouton d'installation.
- Hauteurs, safe areas et panneaux prennent en compte le notch / Dynamic Island / barre Home via `env(safe-area-inset-*)`.
- Le service worker met maintenant en cache le shell réel de l'application (`index.html`, `style.css`, `app.js`, `data/tileCatalog.js`, `view3d.js`, manifest et icônes), puis les assets utilisés à la demande.

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
9. Vérifier installation PWA: bannière visible, ajout écran d'accueil iPhone, lancement standalone, fonctionnement offline après chargement initial.

## Pack C/D/E ajouté (métier + iPhone + perf)
- Tags avancés: `name:category:color` dans Propriétés + tags simples.
- Champs custom par objet: `capacity`, `levels`, `zone`, `aisle`.
- Priorité bin optionnelle `P1..P7` par cellule/objet.
- Export CSV bins (`bin,type,zone,aisle,position,tags`).
- Rapport PDF via fenêtre d'impression (légende + safety).
- Rule engine local (toggles): allée min, issues dégagées, bins connus.
- Mode audit + panneau Règles dans la colonne droite.
- Import JSON: `replace` ou `merge` assisté.
- Migration v1→v2 + fonction “Réparer projet” pour champs manquants.
- Profils locaux (auteur/updatedAt), statut projet (`draft/approved/frozen`) + watermark PNG.
- Mode review (sans écriture auto), comparaison de snapshots (diff highlight canvas).
- Toggle FR/EN (stocké projet), mode iPhone, auto-hide panneaux, focus mode.
- Règles audit étendues: bins avec zone, racks capacité positive, priorité bin obligatoire (option).
- Rule engine JSON: édition directe des toggles de règles dans le panneau Paramètres.
- Export ciblé supplémentaire: `zones.csv` (zone,cells,racks,bins).
- Import merge assisté: confirmation du nombre de cellules écrasées.
- Validation schéma import renforcée (`cells.length`, dimensions).
- Export des logs erreurs/historique (`layout-logs.json`).
- Mode review: ajout de commentaires ancrés à une cellule (sans modifier le layout).
- Comparaison de versions: sélection indices version A/B avant diff canvas.
- Mode performance (désactive effets), overlay FPS debug.

## Format JSON v2 (extraits)
- `layout.rules`
- `layout.tagsCatalog`
- `layout.profiles`, `layout.activeProfileId`
- `layout.projectStatus`, `layout.language`
- `layout.comments`, `layout.errorLogs`
- `layout.cellProps["x,y"].customFields`, `binPriority`, `tagDetails`, `author`, `updatedAt`
