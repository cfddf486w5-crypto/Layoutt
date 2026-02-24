# DL Layout Editor — Pro

Application web offline (sans dépendances) pour éditer un plan d'entrepôt en grille, optimisée iPhone + PC.

## Lancer
1. Ouvrir `index.html` directement dans le navigateur.
2. Tout est local (localStorage + fichiers JSON/PNG).

## Fonctionnalités
- Canvas performant avec pan/zoom (wheel, pinch, outil pan).
- Outils: select, brush, eraser, line, rect (plein/contour), bucket, pan, eyedropper.
- Calques: STRUCTURE/STORAGE/ZONES/SAFETY/ANNOTATIONS (visible + lock).
- Palette pro: recherche, catégories, favoris persistés.
- Propriétés: rotation, note, tags, modifications groupées.
- Blueprint image: import, opacity, scale, offset (Alt+drag), lock.
- Export/Import JSON complet + autosave/restore.
- Export PNG du plan.
- Warnings: portes isolées, bins inconnus.
- Undo/Redo avec historique.

## Gestes / Raccourcis
- iPhone: tap pour peindre, pinch pour zoom, long-press pour multi-sélection.
- PC: molette zoom, Shift+clic multi-sélection, Espace = Pan.
- `Ctrl+Z` / `Ctrl+Y`, `Delete`.

## Dataset démo
Le projet démarre avec un mini entrepôt incluant racks, zones, portes et bins P1 à P7.

## Tests manuels
1. Vérifier fluidité sur grille 120x80.
2. Vérifier verrouillage calque (aucune modif possible).
3. Eyedropper: cliquer une cellule et repeindre ailleurs.
4. Export JSON, recharger page, Import JSON => restauration complète.
5. Export PNG et ouvrir l'image.
6. Charger un blueprint puis modifier opacité/scale.
