# Abdos Tracker — installation iPhone

Cette version est une **PWA** : elle peut être ajoutée à l'écran d'accueil de l'iPhone et s'ouvrir comme une vraie app.

## Important
Le dossier doit être publié sur une adresse HTTPS (par exemple GitHub Pages) avant l'installation. Ne lance pas simplement `index.html` depuis l'app Fichiers : le mode « app » et les fonctions web modernes nécessitent une vraie adresse web.

## Méthode simple avec GitHub Pages
1. Crée un compte GitHub si nécessaire.
2. Crée un nouveau dépôt, par exemple `abdos-tracker`.
3. Envoie **tout le contenu de ce dossier** dans le dépôt :
   - `index.html`
   - `manifest.webmanifest`
   - `sw.js`
   - `icons/`
4. Dans GitHub : Settings → Pages → déploie depuis la branche principale (`main`) et le dossier `/ (root)`.
5. GitHub fournira une adresse HTTPS pour le site.
6. Sur l'iPhone, ouvre cette adresse dans Safari.
7. Touche Partager → **Ajouter à l'écran d'accueil** → active **Ouvrir comme app web** → Ajouter.

La progression est sauvegardée dans le navigateur de l'iPhone et l'application est conçue pour fonctionner hors connexion après son premier chargement.

## État actuel
- 35 étapes du programme de l'image.
- Séquence impossible à sauter accidentellement.
- Jours REPOS inclus.
- Progression sauvegardée.
- Historique des étapes.
- Interface mobile.
- Installation comme app web.
