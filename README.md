# HEALTH//OS

Terminal de diagnostic physique. Direction artistique inspirée de *Marathon* (Bungie).
Pensé pour iPhone 12 Pro, en affichage vertical.

Anciennement AbsTracker, puis Demon Tracker.

## Modules

| Code | Module | État |
|---|---|---|
| P-01 | Stats physique | identité, mensurations, composition, cardio |
| P-02 | Sport | conteneur |
| S-01 | Salle | 3 séances, charges et séries, repère de surcharge |
| S-02 | Performances | records de répétitions, 9 mouvements |
| S-03 | Abdos | 6 circuits, progression en tours |
| S-04 | Convict Conditioning | 6 chaînes, 10 paliers, 3 rythmes |
| S-05 | Gainage | 8 variantes, 10 paliers chacune |
| S-06 | Séance duo | temporaire, à retirer au retour |
| P-03 | eSport | à faire |
| P-04 | Nutrition | à faire |

Le dashboard ouvre sur la séance du jour, calculée depuis la semaine type.

## Semaine type

| Jour | Matin | Soir |
|---|---|---|
| Lundi | Max perf | Salle A — pec, épaules, triceps |
| Mardi | Convict — pompes + relevés | Abdos |
| Mercredi | Max perf | Salle B — dos, biceps |
| Jeudi | Convict — tractions + squats | Abdos |
| Vendredi | Max perf | Salle C — jambes, fessiers |
| Samedi | Abdos | Cardio souple 35 min |
| Dimanche | Repos | |

Convict reste en rythme New Blood et ne tombe jamais le même jour que la salle :
les deux travaillent les mêmes schémas moteurs, et les cumuler en déficit calorique
mène à la stagnation. Le test Max perf tourne sur un seul mouvement par séance.

Activer le module duo bascule toute la semaine sur un planning à deux, sans barre
ni charge lourde. Le désactiver rétablit le programme normal.

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'entrée, React et Babel depuis un CDN |
| `app.jsx` | L'application, transformée dans le navigateur |
| `sw.js` | Service worker : cache l'app et ses dépendances |
| `manifest.webmanifest` | Nom, couleurs et icônes pour l'écran d'accueil |
| `icons/`, `icon.svg` | Icônes |

Aucune étape de build : les fichiers sont servis tels quels par GitHub Pages.

## Installer sur iPhone

1. Ouvrir l'adresse **dans Safari** — Chrome iOS ne sait pas installer d'application web.
2. Bouton Partager, puis **Sur l'écran d'accueil**.
3. Lancer depuis l'icône : plein écran, sans barre d'adresse.

Le premier chargement demande du réseau. Ensuite le service worker sert l'application
depuis le cache, y compris hors ligne.

## Données

Tout est stocké dans le `localStorage` du navigateur. Rien ne part sur un serveur,
aucun compte, aucune analytique.

Effacer l'historique Safari efface la progression. Avant chaque mise à jour, passer par
**DONNÉES → EXPORTER UN FICHIER** dans l'en-tête, et réimporter ensuite. Le fichier
obtenu est un JSON lisible, sauvegardable ailleurs.

## Mise à jour

Après modification du composant source, régénérer `app.jsx` avec trois changements :
import React remplacé par les globales, export par défaut retiré, `window.storage`
réimplémenté sur `localStorage` en tête de fichier.

Changer la valeur de `CACHE` dans `sw.js` à chaque déploiement, sinon les appareils
déjà installés continuent de servir l'ancienne version depuis leur cache.
