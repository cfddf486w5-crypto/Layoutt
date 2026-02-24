SHOP Layout – Version PWA (V10)

Interface iPhone:
- Menus ouvrables uniquement en haut (pas de panneaux flottants)
- Outils / Actions / Données / Infos
- Barre d’actions rapides iPhone en bas (Annuler, Refaire, Sauver, Rechercher)
- Badge réseau amélioré: En ligne / Hors ligne + statut iPhone lié (mode installé)

PWA / Hors-ligne:
- Service Worker renforcé (cache app shell + modules JS + image plan)
- Navigation offline-first avec retour automatique vers index.html
- Sauvegarde locale automatique périodique en complément de la sauvegarde manuelle
- IMPORTANT: ça ne marche pas en ouvrant index.html en "fichier" (file://).
  Il faut servir via https:// (ou http://localhost) pour enregistrer le service worker.

Installation iPhone:
- Ouvre le site dans Safari → bouton Partager → "Sur l’écran d’accueil".

Test rapide:
- Installe l’app puis coupe le Wi‑Fi.
- L’app doit s’ouvrir, le layout reste éditable, et la sauvegarde locale demeure disponible.

Mise à jour:
- Change CACHE_NAME dans service-worker.js et recharge.
