/* HEALTH//OS — service worker.

   Objectif : que l'application démarre sans réseau après un premier
   chargement réussi. Les dépendances viennent d'un CDN, donc elles sont
   mises en cache à la volée comme le reste.

   Changer CACHE invalide l'ancien cache et force le rechargement de tout. */
const CACHE = "healthos-v1";

/* mis en cache à l'installation : le strict nécessaire, servi depuis le dépôt */
const LOCAL = [
  "./",
  "./index.html",
  "./app.jsx",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

/* mis en cache au premier passage : React, ReactDOM et Babel */
const CDN = "https://unpkg.com/";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      /* une ressource manquante ne doit pas faire échouer toute l'installation */
      Promise.allSettled(LOCAL.map((u) => c.add(u)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const estCDN = req.url.startsWith(CDN);
  const estLocal = url.origin === self.location.origin;
  if (!estCDN && !estLocal) return;

  /* Le CDN d'abord depuis le cache : ces fichiers sont figés par leur numéro
     de version, inutile d'aller les rechercher. */
  if (estCDN) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          /* une réponse opaque (cross-origin sans CORS) se met quand même en
             cache et se rejoue correctement dans une balise script */
          if (res && (res.ok || res.type === "opaque")) {
            const copie = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copie));
          }
          return res;
        })
      )
    );
    return;
  }

  /* Le site d'abord depuis le réseau, pour que la mise à jour arrive sans
     attendre, avec repli sur le cache hors ligne. */
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copie = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copie));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match("./index.html"))
      )
  );
});
