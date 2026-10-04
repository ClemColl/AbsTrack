/* HEALTH//OS — build autonome pour GitHub Pages.
   Généré depuis HealthOS.jsx : seuls l'en-tête et le pied diffèrent.

   Hors de Claude, window.storage n'existe pas : on le réimplémente
   sur localStorage avec la même signature (get lève si la clé est absente). */
if (!window.storage) {
  window.storage = {
    async get(k) {
      const v = localStorage.getItem(k);
      if (v === null) throw new Error("clé absente");
      return { key: k, value: v };
    },
    async set(k, v) { localStorage.setItem(k, v); return { key: k, value: v }; },
    async delete(k) { localStorage.removeItem(k); return { key: k, deleted: true }; },
    async list(prefix) {
      return { keys: Object.keys(localStorage).filter((x) => !prefix || x.startsWith(prefix)) };
    },
  };
}

const { useState, useEffect, useMemo, useRef } = React;

/* ============================================================
   HEALTH//OS  —  SHELL DIAGNOSTIC TERMINAL
   v4 : Convict Conditioning, gainage, performances, force/endurance
   DA : Marathon (Bungie). Cible : iPhone 12 Pro (390 x 844).
   ============================================================ */

const STORAGE_KEY = "healthos:shell:v4";

/* ============================================================
   REGISTRE DES CHAMPS
   ============================================================ */
const FIELDS = {
  sexe:      { label: "SEXE",            type: "choice", options: [["H", "HOMME"], ["F", "FEMME"]] },
  age:       { label: "ÂGE",             unit: "ANS",  min: 12,  max: 90,  step: 1 },
  taille:    { label: "TAILLE",          unit: "CM",   min: 140, max: 215, step: 1 },
  poids:     { label: "POIDS",           unit: "KG",   min: 40,  max: 160, step: 0.1 },

  cou:       { label: "TOUR DE COU",     unit: "CM",   min: 25,  max: 55,  step: 0.5 },
  ventre:    { label: "TOUR DE TAILLE",  unit: "CM",   min: 55,  max: 150, step: 0.5 },
  hanches:   { label: "TOUR DE HANCHES", unit: "CM",   min: 60,  max: 160, step: 0.5 },

  epaules:   { label: "ÉPAULES",         unit: "CM",   min: 80,  max: 160, step: 0.5 },
  poitrine:  { label: "POITRINE",        unit: "CM",   min: 70,  max: 145, step: 0.5 },
  bras:      { label: "BRAS DOMINANT",   unit: "CM",   min: 22,  max: 55,  step: 0.5 },
  brasNd:    { label: "BRAS OPPOSÉ",     unit: "CM",   min: 22,  max: 55,  step: 0.5 },
  avantbras: { label: "AVANT-BRAS",      unit: "CM",   min: 18,  max: 42,  step: 0.5 },
  cuisse:    { label: "CUISSE",          unit: "CM",   min: 35,  max: 80,  step: 0.5 },
  mollet:    { label: "MOLLET",          unit: "CM",   min: 25,  max: 55,  step: 0.5 },

  vo2:       { label: "VO2 MAX",         unit: "",     min: 15,  max: 80,  step: 1 },
  fcRepos:   { label: "FC AU REPOS",     unit: "BPM",  min: 35,  max: 100, step: 1 },
  tensionS:  { label: "TENSION SYST.",   unit: "MMHG", min: 80,  max: 200, step: 1 },
  tensionD:  { label: "TENSION DIAST.",  unit: "MMHG", min: 45,  max: 130, step: 1 },

  convict:   { label: "CONVICT COND.",   unit: "%",    min: 0,   max: 100, step: 1, auto: true },
  muscu:     { label: "MUSCU",           unit: "SÉAN.",min: 0,   max: 200, step: 1, auto: true },
  gainage:   { label: "GAINAGE",         unit: "SEC",  min: 0,   max: 600, step: 5, auto: true },
  abdos:     { label: "ABDOS",           unit: "REP",  min: 0,   max: 100, step: 1, auto: true },
  tractions: { label: "TRACTIONS",       unit: "REP",  min: 0,   max: 25,  step: 1, auto: true },
};

const BLANK = Object.fromEntries(Object.keys(FIELDS).map((k) => [k, null]));
const REQUIS = ["sexe", "age", "taille", "poids"];
const RAIL = ["poids", "taille", "convict", "muscu", "gainage", "abdos", "tractions", "bras", "vo2"];
const DRIVES = {
  poids: "MASSE", taille: "STRUCT", convict: "HAUT", muscu: "HAUT", tractions: "HAUT",
  gainage: "TRONC", abdos: "TRONC", bras: "BRAS", vo2: "CARDIO",
};

const PHYS_GROUPS = [
  { label: "IDENTITÉ",       code: "01", fields: ["sexe", "age", "taille", "poids"] },
  { label: "COMPOSITION",    code: "02", fields: ["cou", "ventre", "hanches"] },
  { label: "MENSURATIONS",   code: "03", fields: ["epaules", "poitrine", "bras", "brasNd", "avantbras", "cuisse", "mollet"] },
  { label: "CARDIO / SANTÉ", code: "04", fields: ["vo2", "fcRepos", "tensionS", "tensionD"] },
];

const PLANS = [
  { id: "physique",  code: "P-01", name: "STATS PHYSIQUE", accent: "mint",   desc: "Identité, mensurations, composition, cardio.", ready: true },
  { id: "sport",     code: "P-02", name: "SPORT",          accent: "lime",   desc: "4 protocoles d'entraînement.",                 ready: true },
  { id: "esport",    code: "P-03", name: "ESPORT",         accent: "violet", desc: "Rangs actuels et rangs max par jeu.",          ready: false },
  { id: "nutrition", code: "P-04", name: "NUTRITION",      accent: "amber",  desc: "Repas, macros, préparation.",                  ready: false },
];

const SPORT_SUB = [
  { id: "muscu",   code: "S-01", name: "SALLE",                accent: "flare", desc: "3 séances, charges et séries.",    ready: true },
  { id: "perfs",   code: "S-02", name: "PERFORMANCES",         accent: "amber", desc: "Records de répétitions, 9 mouvements.", ready: true },
  { id: "abdos",   code: "S-03", name: "ABDOS",                accent: "mint",  desc: "6 circuits, progression en tours.", ready: true },
  { id: "convict", code: "S-04", name: "CONVICT CONDITIONING", accent: "lime",  desc: "6 chaînes, 10 paliers, 3 rythmes.", ready: true },
  { id: "gainage", code: "S-05", name: "GAINAGE",              accent: "mint",  desc: "8 variantes, 10 paliers chacune.",  ready: true },
  { id: "duo",     code: "S-06", name: "SÉANCE DUO",           accent: "violet",desc: "Temporaire · 2 semaines à deux.",   ready: true },
];

/* variantes de gainage — chacune a son barème, son plafond et sa condition d'accès.
   Plafonds calés sur des repères de performance (élite atteignable), pas sur des limites médicales. */
const VARIANTES = [
  { id: "ventral", name: "VENTRAL",         max: 600, unlock: null,
    paliers: [20, 30, 45, 60, 90, 120, 180, 300, 450, 600] },
  { id: "latG",    name: "LATÉRAL G",       max: 300, unlock: null,
    paliers: [15, 20, 30, 45, 60, 90, 120, 180, 240, 300] },
  { id: "latD",    name: "LATÉRAL D",       max: 300, unlock: null,
    paliers: [15, 20, 30, 45, 60, 90, 120, 180, 240, 300] },
  { id: "hollow",  name: "HOLLOW",          max: 180, unlock: null,
    paliers: [10, 15, 20, 30, 45, 60, 75, 90, 120, 180] },
  { id: "hsMur",   name: "HANDSTAND MUR",   max: 180, unlock: null,
    paliers: [10, 15, 20, 30, 45, 60, 90, 120, 150, 180] },
  { id: "hsLibre", name: "HANDSTAND LIBRE", max: 120, tag: "AVANCÉ", unlock: { v: "hsMur", s: 60 },
    paliers: [3, 5, 8, 12, 20, 30, 45, 60, 90, 120] },
  { id: "lever",   name: "FRONT LEVER",     max: 30,  tag: "ÉLITE",  unlock: { v: "hollow", s: 60 },
    paliers: [2, 3, 5, 7, 10, 13, 16, 20, 25, 30] },
  { id: "planche", name: "PLANCHE",         max: 20,  tag: "ÉLITE",  unlock: { v: "hsLibre", s: 20 },
    paliers: [1, 2, 3, 4, 5, 7, 9, 12, 16, 20] },
];
const VAR_BY_ID = Object.fromEntries(VARIANTES.map((v) => [v.id, v]));

/* exercices de répétitions — un barème et un plafond par mouvement.
   Plafonds calés sur les standards de force relative (élite atteignable). */
const EXOS = [
  { id: "pompes",   name: "POMPES",          max: 100, unlock: null,
    paliers: [5, 10, 15, 20, 30, 40, 50, 65, 80, 100] },
  { id: "tractions",name: "TRACTIONS",       max: 25,  unlock: null,
    paliers: [1, 2, 3, 5, 8, 11, 14, 17, 21, 25] },
  { id: "dips",     name: "DIPS",            max: 50,  unlock: null,
    paliers: [3, 5, 8, 12, 17, 22, 28, 35, 42, 50] },
  { id: "squats",   name: "SQUATS",          max: 150, unlock: null,
    paliers: [10, 20, 30, 45, 60, 75, 95, 115, 130, 150] },
  { id: "abdos",    name: "ABDOS",           max: 100, unlock: null,
    paliers: [10, 15, 20, 30, 40, 50, 60, 75, 90, 100] },
  { id: "jambes",   name: "RELEVÉ DE JAMBES",max: 25,  unlock: null,
    paliers: [3, 5, 7, 9, 11, 14, 17, 20, 22, 25] },
  { id: "muscleup", name: "MUSCLE-UP",       max: 10,  tag: "AVANCÉ", unlock: { e: "tractions", r: 15 },
    paliers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: "pistol",   name: "PISTOL SQUAT",    max: 20,  tag: "AVANCÉ", unlock: { e: "squats", r: 70 },
    paliers: [1, 2, 3, 5, 7, 9, 11, 14, 17, 20] },
  { id: "pompe1",   name: "POMPE UNE MAIN",  max: 10,  tag: "ÉLITE",  unlock: { e: "pompes", r: 50 },
    paliers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
];
const EXO_BY_ID = Object.fromEntries(EXOS.map((e) => [e.id, e]));

/* ============================================================
   CONVICT CONDITIONING — 6 chaînes, 10 paliers, 3 standards
   std = [[séries, reps] débutant, intermédiaire, progression]
   t:1 = palier chronométré (secondes au lieu de répétitions)
   ============================================================ */
const CC = [
  { id: "pompes", name: "POMPES", pose: "push", steps: [
    { n: "POMPES AU MUR",            d: "Debout face au mur, mains à hauteur d'épaules, corps gainé.",        std: [[1,10],[2,25],[3,50]] },
    { n: "POMPES INCLINÉES",         d: "Mains sur un support à hauteur de hanches, corps en ligne.",          std: [[1,10],[2,20],[3,40]] },
    { n: "POMPES À GENOUX",          d: "Appui sur les genoux, hanches verrouillées, poitrine au sol.",        std: [[1,10],[2,15],[3,30]] },
    { n: "DEMI-POMPES",              d: "Descente jusqu'à l'angle droit aux coudes, pas plus bas.",            std: [[1,8],[2,12],[2,25]] },
    { n: "POMPES COMPLÈTES",         d: "Poitrine effleurant le sol, extension complète en haut.",             std: [[1,5],[2,10],[2,20]] },
    { n: "POMPES SERRÉES",           d: "Index et pouces se touchant, coudes le long du corps.",               std: [[1,5],[2,10],[2,20]] },
    { n: "POMPES ASYMÉTRIQUES",      d: "Une main sur un ballon ou une brique, l'autre au sol.",               std: [[1,5],[2,10],[2,20]], side: 1 },
    { n: "DEMI-POMPES À UN BRAS",    d: "Un seul bras, descente à mi-course, l'autre dans le dos.",            std: [[1,5],[2,10],[2,20]], side: 1 },
    { n: "POMPES EN LEVIER",         d: "Un bras travaille, l'autre repose tendu sur un support.",             std: [[1,5],[2,10],[2,20]], side: 1 },
    { n: "POMPES À UN BRAS",         d: "Amplitude complète sur un seul bras. Palier maître.",                 std: [[1,5],[2,10],[1,100]], side: 1 },
  ]},
  { id: "squats", name: "SQUATS", pose: "squat", steps: [
    { n: "SQUATS EN CHANDELLE",      d: "Sur les épaules, genoux vers le front puis extension.",               std: [[1,10],[2,25],[3,50]] },
    { n: "SQUATS EN CANIF",          d: "Mains sur un support, une partie du poids soulagée par les bras.",    std: [[1,10],[2,20],[3,40]] },
    { n: "SQUATS ASSISTÉS",          d: "Descente complète en se tenant à un montant fixe.",                   std: [[1,10],[2,15],[3,30]] },
    { n: "DEMI-SQUATS",              d: "Descente jusqu'aux cuisses parallèles au sol.",                       std: [[1,8],[2,35],[2,50]] },
    { n: "SQUATS COMPLETS",          d: "Cuisses contre mollets, talons au sol, dos droit.",                   std: [[1,5],[2,10],[2,30]] },
    { n: "SQUATS SERRÉS",            d: "Pieds joints, amplitude complète.",                                   std: [[1,5],[2,10],[2,20]] },
    { n: "SQUATS ASYMÉTRIQUES",      d: "Un pied sur un ballon, l'essentiel du poids sur l'autre jambe.",      std: [[1,5],[2,10],[2,20]], side: 1 },
    { n: "DEMI-SQUATS SUR 1 JAMBE",  d: "Une jambe, descente à mi-course, jambe libre tendue devant.",         std: [[1,5],[2,10],[2,20]], side: 1 },
    { n: "SQUATS 1 JAMBE ASSISTÉS",  d: "Amplitude complète sur une jambe, une main en appui léger.",          std: [[1,5],[2,10],[2,20]], side: 1 },
    { n: "SQUATS SUR UNE JAMBE",     d: "Pistol strict, sans appui. Palier maître.",                           std: [[1,5],[2,10],[2,50]], side: 1 },
  ]},
  { id: "tractions", name: "TRACTIONS", pose: "pull", steps: [
    { n: "TIRAGES VERTICAUX",        d: "Debout, tirage sur un montant vertical, bras seuls.",                 std: [[1,10],[2,20],[3,40]] },
    { n: "TIRAGES HORIZONTAUX",      d: "Corps sous une barre basse, tirage poitrine vers la barre.",          std: [[1,10],[2,20],[3,30]] },
    { n: "TRACTIONS EN CANIF",       d: "Pieds posés devant sur un support, jambes fléchies.",                 std: [[1,10],[2,15],[3,20]] },
    { n: "DEMI-TRACTIONS",           d: "Départ coudes à 90°, montée jusqu'au menton.",                        std: [[1,8],[2,11],[2,15]] },
    { n: "TRACTIONS COMPLÈTES",      d: "Suspension bras tendus, menton au-dessus de la barre.",               std: [[1,5],[2,8],[2,10]] },
    { n: "TRACTIONS SERRÉES",        d: "Mains jointes, menton passant à côté des poings.",                    std: [[1,5],[2,8],[2,10]] },
    { n: "TRACTIONS ASYMÉTRIQUES",   d: "Une main sur la barre, l'autre agrippant le poignet.",                std: [[1,5],[2,7],[2,9]], side: 1 },
    { n: "DEMI-TRACTIONS À UN BRAS", d: "Un bras, départ coudes à 90°.",                                       std: [[1,4],[2,6],[2,8]], side: 1 },
    { n: "TRACTIONS 1 BRAS ASSIST.", d: "Un bras sur la barre, l'autre tirant sur une serviette.",             std: [[1,3],[2,5],[2,7]], side: 1 },
    { n: "TRACTIONS À UN BRAS",      d: "Suspension et montée sur un seul bras. Palier maître.",               std: [[1,1],[2,3],[2,6]], side: 1 },
  ]},
  { id: "jambes", name: "RELEVÉS DE JAMBES", pose: "leg", steps: [
    { n: "GENOUX REPLIÉS ASSIS",     d: "Assis, mains en appui, genoux ramenés vers la poitrine.",             std: [[1,10],[2,25],[3,40]] },
    { n: "RELEVÉS DE GENOUX AU SOL", d: "Allongé, genoux fléchis ramenés au-dessus des hanches.",              std: [[1,10],[2,20],[3,35]] },
    { n: "JAMBES FLÉCHIES AU SOL",   d: "Allongé, jambes semi-fléchies montant à la verticale.",               std: [[1,10],[2,15],[3,30]] },
    { n: "GRENOUILLE AU SOL",        d: "Montée genoux fléchis, descente jambes tendues.",                     std: [[1,10],[2,15],[3,25]] },
    { n: "JAMBES TENDUES AU SOL",    d: "Allongé, jambes tendues jointes montant à la verticale.",             std: [[1,10],[2,15],[2,20]] },
    { n: "GENOUX SUSPENDU",          d: "Suspendu à la barre, genoux à hauteur de hanches.",                   std: [[1,10],[2,15],[3,20]] },
    { n: "JAMBES FLÉCHIES SUSPENDU", d: "Suspendu, jambes semi-fléchies à l'horizontale.",                     std: [[1,10],[2,15],[2,15]] },
    { n: "GRENOUILLE SUSPENDU",      d: "Suspendu, montée fléchie puis extension à l'horizontale.",            std: [[1,5],[2,10],[2,15]] },
    { n: "JAMBES TENDUES PARTIEL",   d: "Suspendu, jambes tendues montant à mi-hauteur.",                      std: [[1,5],[2,10],[2,15]] },
    { n: "JAMBES TENDUES SUSPENDU",  d: "Suspendu, jambes tendues jusqu'à la barre. Palier maître.",           std: [[1,5],[2,10],[2,30]] },
  ]},
  { id: "pont", name: "PONT", pose: "bridge", steps: [
    { n: "PONT COURT",               d: "Allongé, pieds au sol, hanches poussées vers le plafond.",            std: [[1,10],[2,25],[3,50]] },
    { n: "PONT DROIT",               d: "Assis jambes tendues, mains derrière, corps aligné.",                 std: [[1,10],[2,20],[3,40]] },
    { n: "PONT INCLINÉ",             d: "Mains sur un support surélevé, bassin poussé haut.",                  std: [[1,8],[2,15],[3,30]] },
    { n: "PONT SUR LA TÊTE",         d: "Sommet du crâne au sol, appui partagé mains et tête.",                std: [[1,8],[2,15],[2,25]] },
    { n: "DEMI-PONT",                d: "Mains sur un support bas, bras presque tendus.",                      std: [[1,8],[2,15],[2,20]] },
    { n: "PONT COMPLET",             d: "Bras et jambes tendus, arche complète depuis le sol.",                std: [[1,6],[2,10],[2,15]] },
    { n: "PONT MURAL DESCENDANT",    d: "Debout dos au mur, descente des mains jusqu'au sol.",                 std: [[1,3],[2,6],[2,10]] },
    { n: "PONT MURAL MONTANT",       d: "Depuis le pont, remontée des mains jusqu'à la station debout.",       std: [[1,2],[2,4],[2,8]] },
    { n: "PONT PLONGEANT",           d: "Debout, descente arrière libre jusqu'au pont.",                       std: [[1,1],[2,3],[2,6]] },
    { n: "PONT DEBOUT À DEBOUT",     d: "Descente et remontée sans appui. Palier maître.",                     std: [[1,1],[2,3],[2,30]] },
  ]},
  { id: "equilibre", name: "ÉQUILIBRE", pose: "hs", steps: [
    { n: "POIRIER AU MUR",           d: "Tête et mains au sol en triangle, pieds contre le mur.",              std: [[1,30],[1,60],[1,120]], t: 1 },
    { n: "ÉQUILIBRE DU CORBEAU",     d: "Genoux posés sur les triceps, poids sur les mains.",                  std: [[1,10],[1,30],[1,60]], t: 1 },
    { n: "ÉQUILIBRE AU MUR",         d: "Bras tendus, corps vertical, talons contre le mur.",                  std: [[1,30],[1,60],[1,120]], t: 1 },
    { n: "DEMI-POMPES ÉQUILIBRE",    d: "En équilibre au mur, descente à mi-course.",                          std: [[1,5],[2,10],[2,20]] },
    { n: "POMPES EN ÉQUILIBRE",      d: "Descente jusqu'à ce que le crâne effleure le sol.",                   std: [[1,5],[2,10],[2,15]] },
    { n: "ÉQUILIBRE SERRÉES",        d: "Mains jointes, amplitude complète.",                                  std: [[1,5],[2,9],[2,12]] },
    { n: "ÉQUILIBRE ASYMÉTRIQUES",   d: "Une main surélevée sur un ballon ou une brique.",                     std: [[1,5],[2,8],[2,10]], side: 1 },
    { n: "DEMI À UN BRAS",           d: "Un bras, descente à mi-course.",                                      std: [[1,4],[2,6],[2,8]], side: 1 },
    { n: "ÉQUILIBRE EN LEVIER",      d: "Un bras travaille, l'autre en appui léger sur un support.",           std: [[1,3],[2,4],[2,6]], side: 1 },
    { n: "ÉQUILIBRE À UN BRAS",      d: "Pompe complète sur un seul bras. Palier maître.",                     std: [[1,1],[2,2],[1,5]], side: 1 },
  ]},
];
const CC_BY_ID = Object.fromEntries(CC.map((c) => [c.id, c]));
const CC_STD = ["DÉBUTANT", "INTERMÉDIAIRE", "PROGRESSION"];

/* rythmes du programme — index de jour JS, 0 = dimanche */
const RYTHMES = [
  { id: "new",  name: "NEW BLOOD",     sub: "2 séances / semaine · les 4 fondamentaux",
    jours: { 2: ["pompes", "jambes"], 4: ["tractions", "squats"] } },
  { id: "good", name: "GOOD BEHAVIOR", sub: "3 séances / semaine · les 6 chaînes",
    jours: { 1: ["pompes", "jambes"], 3: ["tractions", "squats"], 5: ["pont", "equilibre"] } },
  { id: "vet",  name: "VETERANO",      sub: "6 séances / semaine · cycle doublé",
    jours: { 1: ["pompes", "jambes"], 2: ["tractions", "squats"], 3: ["pont", "equilibre"],
             4: ["pompes", "jambes"], 5: ["tractions", "squats"], 6: ["pont", "equilibre"] } },
];
const JOURS = ["DIMANCHE", "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

/* ============================================================
   PROGRAMME — séances, circuits et semaine type
   ============================================================ */
const MUSCU_SEANCES = [
  { id: "A", name: "PEC / ÉPAULES / TRICEPS", ex: [
    { n: "DÉVELOPPÉ COUCHÉ HALTÈRES", s: 4, r: 8 },
    { n: "DÉVELOPPÉ INCLINÉ MACHINE", s: 3, r: 10 },
    { n: "ÉCARTÉ POULIE", s: 3, r: 12 },
    { n: "DÉVELOPPÉ MILITAIRE", s: 4, r: 8 },
    { n: "ÉLÉVATIONS LATÉRALES", s: 3, r: 15 },
    { n: "EXTENSIONS TRICEPS POULIE", s: 3, r: 12 },
  ]},
  { id: "B", name: "DOS / BICEPS", ex: [
    { n: "TRACTIONS OU TIRAGE VERTICAL", s: 4, r: 8 },
    { n: "ROWING BARRE", s: 4, r: 8 },
    { n: "TIRAGE HORIZONTAL", s: 3, r: 10 },
    { n: "PULLOVER POULIE", s: 3, r: 12 },
    { n: "CURL BARRE", s: 3, r: 10 },
    { n: "CURL MARTEAU", s: 3, r: 12 },
  ]},
  { id: "C", name: "JAMBES / FESSIERS", ex: [
    { n: "SQUAT", s: 4, r: 8 },
    { n: "PRESSE À CUISSES", s: 3, r: 12 },
    { n: "SOULEVÉ DE TERRE ROUMAIN", s: 4, r: 8 },
    { n: "HIP THRUST", s: 3, r: 12 },
    { n: "LEG CURL", s: 3, r: 12 },
    { n: "MOLLETS DEBOUT", s: 4, r: 15 },
  ]},
];
const MUSCU_BY_ID = Object.fromEntries(MUSCU_SEANCES.map((x) => [x.id, x]));

/* circuits abdos — 6 niveaux, franchis en validant le circuit complet 3 fois */
const ABDOS_NIV = [
  { n: "AMORÇAGE",  tours: 2, repos: 45, ex: ["CRUNCH ×20", "RELEVÉS DE GENOUX ×15", "PLANCHE 30 S", "TWISTS RUSSES ×20"] },
  { n: "TENSION",   tours: 3, repos: 40, ex: ["CRUNCH PIEDS DÉCOLLÉS ×25", "RELEVÉS JAMBES TENDUES ×12", "HOLLOW 20 S", "TWISTS LESTÉS ×24"] },
  { n: "SURCHARGE", tours: 3, repos: 35, ex: ["V-UPS ×15", "RELEVÉS GENOUX SUSPENDU ×12", "PLANCHE LATÉRALE 30 S / CÔTÉ", "MOUNTAIN CLIMBERS ×40"] },
  { n: "BRÛLURE",   tours: 4, repos: 30, ex: ["TOES-TO-BAR PARTIELS ×10", "HOLLOW ROCK ×25", "DRAGON FLAG NÉGATIF ×6", "ROLL-OUT GENOUX ×10"] },
  { n: "ÉTAU",      tours: 4, repos: 30, ex: ["TOES-TO-BAR ×10", "DRAGON FLAG ×5", "PLANCHE DYNAMIQUE 45 S", "ROLL-OUT GENOUX ×15"] },
  { n: "VERROU",    tours: 5, repos: 25, ex: ["TOES-TO-BAR LESTÉ ×8", "DRAGON FLAG ×8", "HOLLOW 60 S", "ROLL-OUT DEBOUT ×10"] },
];
const ABDOS_SEUIL = 3;   // circuits complets avant de passer au niveau suivant

/* séances duo — temporaire, sans barre ni charge lourde */
const DUO_SEANCES = [
  { id: "D1", name: "BAS DU CORPS", ex: [
    { n: "VÉLO OU RAMEUR", s: 1, r: "5 MIN" },
    { n: "GOBLET SQUAT LÉGER", s: 3, r: 12 },
    { n: "FENTES ALTERNÉES", s: 3, r: "10 / JAMBE" },
    { n: "HIP THRUST", s: 3, r: 12 },
    { n: "STEP-UP SUR BANC", s: 3, r: 12 },
    { n: "VÉLO 20 S VITE / 40 S LENT", s: 8, r: "1 MIN" },
  ]},
  { id: "D2", name: "HAUT DU CORPS", ex: [
    { n: "TIRAGE VERTICAL MACHINE", s: 3, r: 12 },
    { n: "DÉVELOPPÉ ASSIS MACHINE", s: 3, r: 12 },
    { n: "ROWING HALTÈRES", s: 3, r: 12 },
    { n: "ÉLÉVATIONS LATÉRALES LÉGÈRES", s: 3, r: 15 },
    { n: "SUITCASE CARRY 20 M", s: 3, r: "20 M" },
    { n: "SHADOW BOXING", s: 3, r: "1 MIN" },
  ]},
  { id: "D3", name: "CIRCUIT LUDIQUE", ex: [
    { n: "FARMER WALK 30 M", s: 4, r: "30 M" },
    { n: "SWING HALTÈRE LÉGER", s: 4, r: 15 },
    { n: "STEP-UP RAPIDE", s: 4, r: 12 },
    { n: "BOXE AU SAC", s: 4, r: "45 S" },
    { n: "CORDE À SAUTER", s: 4, r: "45 S" },
  ]},
];
const DUO_BY_ID = Object.fromEntries(DUO_SEANCES.map((x) => [x.id, x]));

/* rotation des tests du matin — un mouvement par séance */
const PERF_ROTATION = ["pompes", "tractions", "squats", "dips", "abdos", "jambes"];

/* semaine type. t = type de bloc, s = identifiant de séance */
const SEMAINE = {
  1: [{ t: "perf" }, { t: "muscu", s: "A" }],
  2: [{ t: "cc" }, { t: "abdos" }],
  3: [{ t: "perf" }, { t: "muscu", s: "B" }],
  4: [{ t: "cc" }, { t: "abdos" }],
  5: [{ t: "perf" }, { t: "muscu", s: "C" }],
  6: [{ t: "abdos" }, { t: "cardio" }],
  0: [{ t: "repos" }],
};
const SEMAINE_DUO = {
  1: [{ t: "duo", s: "D1" }],
  2: [{ t: "perf" }],
  3: [{ t: "duo", s: "D2" }],
  4: [{ t: "cardio" }],
  5: [{ t: "duo", s: "D3" }],
  6: [{ t: "cardio" }],
  0: [{ t: "repos" }],
};
const BLOCS = {
  perf:   { lab: "MAX PERF",      sub: "Au réveil · 10 min",     vue: "perfs",   acc: "amber" },
  cc:     { lab: "CONVICT",       sub: "Chaînes du jour",        vue: "convict", acc: "lime" },
  abdos:  { lab: "ABDOS",         sub: "Circuit en tours",       vue: "abdos",   acc: "mint" },
  muscu:  { lab: "SALLE",         sub: "Charges et séries",      vue: "muscu",   acc: "flare" },
  duo:    { lab: "SÉANCE DUO",    sub: "À deux, sans barre",     vue: "duo",     acc: "violet" },
  cardio: { lab: "CARDIO SOUPLE", sub: "Marche vive ou vélo 35 min", vue: null,  acc: "mint" },
  repos:  { lab: "REPOS",         sub: "Récupération complète",  vue: null,      acc: "ash" },
};
const jourISO = (d) => new Date(d).toISOString().slice(0, 10);

/* anciens enregistrements stockés par nom */
const VAR_LEGACY = { "VENTRAL": "ventral", "LATÉRAL G": "latG", "LATÉRAL D": "latD", "HOLLOW": "hollow" };
const fmtSec = (s) =>
  s < 60 ? `${s}"` : s % 60 === 0 ? `${s / 60}'` : `${Math.floor(s / 60)}'${String(s % 60).padStart(2, "0")}`;

/* ============================================================
   OUTILS
   ============================================================ */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const has = (x) =>
  x !== null && x !== undefined && x !== "" && !(typeof x === "number" && isNaN(x));
const norm = (id, val) => {
  if (!has(val)) return 0;
  const f = FIELDS[id];
  return clamp((val - f.min) / (f.max - f.min), 0, 1);
};
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A.map((c, i) => Math.round(c + (B[i] - c) * clamp(t, 0, 1))).join(",")})`;
};
const C = { flare: "#FF2E55", amber: "#FF8A1A", lime: "#D6F94A", mint: "#31F08C" };
const integrityColor = (t) =>
  t < 0.5 ? mix(C.flare, C.lime, t / 0.5) : mix(C.lime, C.mint, (t - 0.5) / 0.5);
const fmt = (n, d = 1) => (!has(n) || !isFinite(n) ? "—" : n.toFixed(d));
const showVal = (id, val) => {
  const f = FIELDS[id];
  if (!has(val)) return "—";
  if (f.type === "choice") return (f.options.find((o) => o[0] === val) || ["", "—"])[1];
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
};
const chrono = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.${Math.floor((ms % 1000) / 100)}`;
};
const dateFr = (t) => new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });

/* ============================================================
   ANALYSE
   ============================================================ */
function analyse(v) {
  const H = v.sexe === "H";
  const out = { H };
  const L = Math.log10;

  out.imc = has(v.poids) && has(v.taille) ? v.poids / Math.pow(v.taille / 100, 2) : null;
  out.imcStat = out.imc == null ? "off" : out.imc < 18.5 ? "warn" : out.imc < 25 ? "ok" : out.imc < 30 ? "mid" : "warn";
  out.imcTxt = out.imc == null ? "EN ATTENTE"
    : out.imc < 18.5 ? "SOUS-POIDS" : out.imc < 25 ? "NORMAL" : out.imc < 30 ? "SURPOIDS" : "OBÉSITÉ";

  /* masse grasse — U.S. Navy, variante métrique */
  let bf = null;
  const ok = has(v.sexe) && has(v.taille) && has(v.cou) && has(v.ventre) && (H || has(v.hanches));
  if (ok) {
    const a1 = H ? v.ventre - v.cou : v.ventre + v.hanches - v.cou;
    if (a1 > 0) {
      bf = H
        ? 495 / (1.0324 - 0.19077 * L(a1) + 0.15456 * L(v.taille)) - 450
        : 495 / (1.29579 - 0.35004 * L(a1) + 0.22100 * L(v.taille)) - 450;
      if (!isFinite(bf) || bf <= 2 || bf > 70) bf = null;
    }
  }
  out.bf = bf;
  out.bfStat = bf == null ? "off"
    : H ? (bf < 6 ? "mid" : bf < 18 ? "ok" : bf < 25 ? "mid" : "warn")
        : (bf < 14 ? "mid" : bf < 25 ? "ok" : bf < 32 ? "mid" : "warn");
  out.bfTxt = bf == null ? "COU + TAILLE REQUIS"
    : H ? (bf < 6 ? "TRÈS BAS" : bf < 14 ? "ATHLÉTIQUE" : bf < 18 ? "EN FORME" : bf < 25 ? "MOYEN" : "ÉLEVÉ")
        : (bf < 14 ? "TRÈS BAS" : bf < 21 ? "ATHLÉTIQUE" : bf < 25 ? "EN FORME" : bf < 32 ? "MOYEN" : "ÉLEVÉ");

  /* masse maigre */
  out.lbm = bf != null && has(v.poids) ? v.poids * (1 - bf / 100)
    : has(v.poids) && has(v.taille) && has(v.sexe)
      ? (H ? 0.407 * v.poids + 0.267 * v.taille - 19.2 : 0.252 * v.poids + 0.473 * v.taille - 48.3)
      : null;
  out.estimeBf = bf == null;

  /* métabolisme de base */
  out.mb = out.lbm != null && bf != null ? 370 + 21.6 * out.lbm
    : has(v.poids) && has(v.taille) && has(v.age) && has(v.sexe)
      ? 10 * v.poids + 6.25 * v.taille - 5 * v.age + (H ? 5 : -161)
      : null;

  out.fcMax = has(v.age) ? Math.round(208 - 0.7 * v.age) : null;
  out.reserve = out.fcMax != null && has(v.fcRepos) ? out.fcMax - v.fcRepos : null;

  const st = (x, good, mid) => (x <= good ? "ok" : x <= mid ? "mid" : "warn");
  out.whr = has(v.ventre) && has(v.hanches) ? v.ventre / v.hanches : null;
  out.whrStat = out.whr == null ? "off" : H ? st(out.whr, 0.90, 0.95) : st(out.whr, 0.80, 0.85);
  out.whtr = has(v.ventre) && has(v.taille) ? v.ventre / v.taille : null;
  out.whtrStat = out.whtr == null ? "off" : st(out.whtr, 0.50, 0.58);

  out.asym = has(v.bras) && has(v.brasNd)
    ? Math.abs(v.bras - v.brasNd) / Math.max(v.bras, v.brasNd) * 100 : null;
  out.asymStat = out.asym == null ? "off" : out.asym < 2 ? "ok" : out.asym < 4 ? "mid" : "warn";

  if (has(v.vo2) && has(v.age) && has(v.sexe)) {
    const band = v.age < 30 ? 0 : v.age < 40 ? 1 : v.age < 50 ? 2 : v.age < 60 ? 3 : 4;
    out.seuil = (H ? [43, 42, 40, 36, 33] : [37, 35, 32, 29, 27])[band];
    out.vo2Stat = v.vo2 >= out.seuil ? "ok" : v.vo2 >= out.seuil - 6 ? "mid" : "warn";
    out.vo2Txt = v.vo2 >= out.seuil + 8 ? "EXCELLENT" : v.vo2 >= out.seuil ? "BON"
      : v.vo2 >= out.seuil - 6 ? "MOYEN" : "FAIBLE";
  } else { out.seuil = null; out.vo2Stat = "off"; out.vo2Txt = "ÂGE + SEXE REQUIS"; }

  out.tenStat = has(v.tensionS) && has(v.tensionD)
    ? (v.tensionS < 120 && v.tensionD < 80 ? "ok" : v.tensionS < 140 && v.tensionD < 90 ? "mid" : "warn")
    : "off";
  return out;
}

/* ============================================================
   CAPACITÉS — force et endurance, agrégées depuis tous les modules
   ============================================================ */
const recordsOf = (log, keyId, keyVal, index, legacy) => {
  const r = {};
  for (const e of log || []) {
    const id = index[e[keyId]] ? e[keyId] : legacy ? legacy[e[keyId]] : null;
    if (id) r[id] = Math.max(r[id] || 0, e[keyVal]);
  }
  return r;
};

const ccPourcent = (steps) =>
  Math.round(CC.reduce((m, c) => m + ((steps[c.id] || 1) - 1) / 9, 0) / CC.length * 100);

function capacites(S) {
  const v = S.v || {};
  const cc = (S.cc && S.cc.steps) || {};
  const g = recordsOf(S.gainage && S.gainage.log, "v", "s", VAR_BY_ID, VAR_LEGACY);
  const p = recordsOf(S.perfs && S.perfs.log, "e", "r", EXO_BY_ID);
  const r = (x, max) => clamp((x || 0) / max, 0, 1);
  const lvl = (c) => clamp(((cc[c] || 1) - 1) / 9, 0, 1);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

  /* force : paliers de force relative, tenues difficiles, mouvements à faible volume */
  const force = avg([
    avg([lvl("pompes"), lvl("tractions"), lvl("equilibre")]),
    avg([r(p.tractions, 25), r(p.muscleup, 10), r(p.pompe1, 10), r(p.pistol, 20), r(p.dips, 50)]),
    avg([r(g.planche, 20), r(g.lever, 30), r(g.hsLibre, 120)]),
  ]);

  /* endurance : volume répété, tenues longues, capacité cardio */
  const cardio = avg([
    norm("vo2", v.vo2),
    has(v.fcRepos) ? clamp((100 - v.fcRepos) / 45, 0, 1) : 0,
  ]);
  const endurance = avg([
    avg([lvl("squats"), lvl("jambes"), lvl("pont")]),
    avg([r(p.pompes, 100), r(p.squats, 150), r(p.abdos, 100), r(p.jambes, 25)]),
    avg([r(g.ventral, 600), r(g.latG, 300), r(g.latD, 300), r(g.hollow, 180)]),
    cardio,
  ]);

  /* Le sommet des barèmes vise la prouesse : sans correction, la moyenne brute
     colle tout le monde sous 15/100 tant que les mouvements d'élite valent zéro.
     Une courbe concave rend le début lisible en laissant 100 à sa place. */
  const courbe = (x) => Math.pow(clamp(x, 0, 1), 0.7);

  return { force: courbe(force), endurance: courbe(endurance), cardio, g, p };
}

function shellMetrics(S) {
  const v = S.v || {};
  const a = analyse(v);
  const cap = capacites(S);
  const g = cap.g, p = cap.p;

  const upper = cap.force;
  const core = clamp((g.ventral || 0) / 600 * 0.4 + (g.hollow || 0) / 180 * 0.3
    + (p.abdos || 0) / 100 * 0.3, 0, 1);
  const arms = has(v.bras)
    ? (norm("bras", v.bras) + clamp((p.tractions || 0) / 25, 0, 1)) / 2
    : clamp((p.tractions || 0) / 25, 0, 1);
  const cardio = cap.cardio;
  const mass = has(v.poids) ? norm("poids", v.poids) : 0.35;
  const struct = has(v.taille) ? norm("taille", v.taille) : 0.5;
  const H = v.sexe !== "F";
  const seuilNet = H ? 12 : 20;
  const adipo = a.bf == null ? 0.35 : clamp((a.bf - seuilNet) / 18, 0, 1);
  const net = 1 - adipo * 0.75;
  const integrity = (cap.force + cap.endurance) / 2;
  return { upper, core, arms, cardio, mass, struct, net, integrity, H,
    force: cap.force, endurance: cap.endurance };
}

/* ============================================================
   PICTOGRAMMES
   ============================================================ */
const Glyph = ({ name }) => {
  const p = { fill: "currentColor" };
  const shapes = {
    physique: (<>
      <rect x="10" y="2" width="4" height="4" {...p} />
      <rect x="8" y="7" width="8" height="9" {...p} />
      <rect x="5" y="7" width="2" height="7" {...p} />
      <rect x="17" y="7" width="2" height="7" {...p} />
      <rect x="9" y="17" width="2" height="5" {...p} />
      <rect x="13" y="17" width="2" height="5" {...p} />
      <rect x="21" y="3" width="2" height="18" {...p} opacity="0.55" />
      <rect x="19" y="3" width="4" height="1.6" {...p} opacity="0.55" />
      <rect x="19" y="11" width="4" height="1.6" {...p} opacity="0.55" />
      <rect x="19" y="19.4" width="4" height="1.6" {...p} opacity="0.55" />
    </>),
    sport: (<>
      <rect x="1" y="8" width="3" height="8" {...p} />
      <rect x="4.5" y="5.5" width="3.5" height="13" {...p} />
      <rect x="16" y="5.5" width="3.5" height="13" {...p} />
      <rect x="20" y="8" width="3" height="8" {...p} />
      <rect x="8" y="10.5" width="8" height="3" {...p} />
    </>),
    esport: (<>
      <rect x="2" y="14" width="4" height="8" {...p} />
      <rect x="8" y="9" width="4" height="13" {...p} />
      <rect x="14" y="5" width="4" height="17" {...p} />
      <rect x="20" y="1" width="3" height="21" {...p} opacity="0.5" />
    </>),
    nutrition: (<>
      <rect x="3" y="3" width="2.5" height="8" {...p} />
      <rect x="7" y="3" width="2.5" height="8" {...p} />
      <rect x="3" y="11" width="6.5" height="2.5" {...p} />
      <rect x="5" y="13" width="2.5" height="9" {...p} />
      <rect x="14" y="3" width="7" height="10" {...p} />
      <rect x="16.5" y="13" width="2.5" height="9" {...p} />
    </>),
    convict: (<>
      <rect x="2" y="3" width="2.5" height="18" {...p} />
      <rect x="7" y="3" width="2.5" height="18" {...p} />
      <rect x="12" y="3" width="2.5" height="18" {...p} />
      <rect x="17" y="3" width="2.5" height="18" {...p} />
      <rect x="2" y="10.5" width="17.5" height="3" {...p} opacity="0.5" />
    </>),
    gainage: (<>
      <rect x="1" y="10" width="22" height="3" {...p} />
      <rect x="4" y="14" width="3" height="6" {...p} opacity="0.6" />
      <rect x="17" y="14" width="3" height="6" {...p} opacity="0.6" />
      <rect x="10" y="3" width="4" height="4" {...p} />
    </>),
    perfs: (<>
      <rect x="2" y="15" width="4" height="7" {...p} opacity="0.5" />
      <rect x="8" y="11" width="4" height="11" {...p} opacity="0.7" />
      <rect x="14" y="7" width="4" height="15" {...p} />
      <rect x="20" y="2" width="3" height="20" {...p} />
      <rect x="1" y="4" width="16" height="1.6" {...p} opacity="0.45" />
    </>),
    duo: (<>
      <rect x="3" y="3" width="4" height="4" {...p} />
      <rect x="2" y="9" width="6" height="8" {...p} />
      <rect x="2" y="18" width="2.5" height="4" {...p} />
      <rect x="5.5" y="18" width="2.5" height="4" {...p} />
      <rect x="16" y="3" width="4" height="4" {...p} opacity="0.65" />
      <rect x="15" y="9" width="6" height="8" {...p} opacity="0.65" />
      <rect x="15" y="18" width="2.5" height="4" {...p} opacity="0.65" />
      <rect x="18.5" y="18" width="2.5" height="4" {...p} opacity="0.65" />
      <rect x="9" y="11" width="5" height="2" {...p} />
    </>),
    muscu: (<>
      <rect x="3" y="3" width="18" height="18" {...p} opacity="0.25" />
      <rect x="6" y="6" width="12" height="12" {...p} opacity="0.5" />
      <rect x="9.5" y="9.5" width="5" height="5" {...p} />
    </>),
  };
  return <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">{shapes[name]}</svg>;
};

/* ============================================================
   LE CORPS — SHELL
   ============================================================ */
const Shell = ({ S, compact = false, uid = "a" }) => {
  const m = shellMetrics(S);
  const v = S.v;
  const col = integrityColor(m.integrity);
  const CX = 100;

  const SW = (m.H ? 32 : 27) + m.upper * 12 + m.mass * 6;
  const WW = (m.H ? 15 : 14) + m.mass * 12 - m.core * 4;
  const HW = (m.H ? 22 : 27) + m.mass * 8;
  const armW = 6 + m.arms * 7 + m.upper * 2;
  const legW = 13 + m.mass * 5 + m.upper * 5;
  const scaleY = 0.94 + m.struct * 0.12;

  const torso = `M ${CX - SW} 76 C ${CX - SW + 1} 106, ${CX - WW - 6} 124, ${CX - WW} 158
                 L ${CX + WW} 158 C ${CX + WW + 6} 124, ${CX + SW - 1} 106, ${CX + SW} 76 Z`;
  const pelvis = `M ${CX - WW} 158 L ${CX + WW} 158 L ${CX + HW - 4} 196 L ${CX - HW + 4} 196 Z`;

  return (
    <svg viewBox="0 0 200 440" width="100%" height="100%" className="shell-svg" aria-hidden="true">
      <defs>
        <filter id={`bloom-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={compact ? 2 : 4} result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id={`torso-${uid}`}><path d={torso} /></clipPath>
      </defs>
      <g transform={`translate(0 ${(1 - scaleY) * 200}) scale(1 ${scaleY})`}>
        <g opacity={0.14 + m.cardio * 0.4} stroke={col} fill="none" strokeWidth="0.7">
          {Array.from({ length: 11 }).map((_, i) => {
            const x = CX - 44 + i * 8.8;
            return (
              <path key={i} className="filament"
                style={{ animationDuration: `${5.2 - m.cardio * 2.4}s`, animationDelay: `${i * 0.19}s` }}
                d={`M ${x} 60 C ${x + (i % 2 ? 12 : -12)} 150, ${x - (i % 2 ? 10 : -10)} 260, ${x} 380`} />
            );
          })}
        </g>
        <g stroke={col} strokeLinecap="round" fill="none" opacity="0.82" filter={`url(#bloom-${uid})`}>
          <path strokeWidth={armW} d={`M ${CX - SW + 5} 84 L ${CX - SW - 6} 138 L ${CX - SW - 9} 192`} />
          <path strokeWidth={armW} d={`M ${CX + SW - 5} 84 L ${CX + SW + 6} 138 L ${CX + SW + 9} 192`} />
          <path strokeWidth={legW} d={`M ${CX - HW + 9} 200 L ${CX - 20} 292 L ${CX - 23} 384`} />
          <path strokeWidth={legW} d={`M ${CX + HW - 9} 200 L ${CX + 20} 292 L ${CX + 23} 384`} />
        </g>
        <g fill={col} opacity="0.9" filter={`url(#bloom-${uid})`}>
          <ellipse cx={CX} cy="36" rx="15" ry="19" />
          <rect x={CX - 7} y="52" width="14" height="16" />
          <path d={torso} />
          <path d={pelvis} />
          <rect x={CX - 30} y="386" width="16" height="7" rx="2" />
          <rect x={CX + 14} y="386" width="16" height="7" rx="2" />
        </g>
        <g clipPath={`url(#torso-${uid})`}>
          <g fill="#080A08" opacity={(0.22 + m.upper * 0.5) * m.net}>
            <ellipse cx={CX - SW / 2.4} cy="98" rx={SW / 3} ry="13" />
            <ellipse cx={CX + SW / 2.4} cy="98" rx={SW / 3} ry="13" />
          </g>
          <g fill="#080A08" opacity={(0.18 + m.core * 0.6) * m.net}>
            {[0, 1, 2].map((r) => [0, 1].map((c) => (
              <rect key={`${r}${c}`} x={CX + (c ? 2 : -2 - WW * 0.62)} y={116 + r * 13}
                width={WW * 0.62} height="10" rx="2" />
            )))}
          </g>
        </g>
        {!compact && <rect className="scanline" x="0" y="0" width="200" height="2.5" fill={col} opacity="0.5" />}
      </g>
    </svg>
  );
};

/* ============================================================
   BRIQUES UI
   ============================================================ */
const Rule = ({ label, right }) => (
  <div className="rule">
    <span className="rule-label">{label}</span>
    <span className="rule-line" />
    {right != null && <span className="rule-right">{right}</span>}
  </div>
);

const NumInput = ({ id, value, onChange, autoFocus }) => {
  const f = FIELDS[id];
  const [raw, setRaw] = useState(has(value) ? String(value) : "");
  useEffect(() => { setRaw(has(value) ? String(value) : ""); }, [value]);
  return (
    <div className="numwrap">
      <input className="numin" type="number" inputMode="decimal" step={f.step}
        placeholder="0" value={raw} autoFocus={autoFocus}
        onChange={(e) => {
          setRaw(e.target.value);
          const n = parseFloat(e.target.value);
          onChange(isNaN(n) ? null : n);
        }}
        onBlur={() => {
          const n = parseFloat(raw);
          if (isNaN(n)) { onChange(null); setRaw(""); }
          else { const c = clamp(n, f.min, f.max); onChange(c); setRaw(String(c)); }
        }} />
      <span className="numunit">{f.unit}</span>
    </div>
  );
};

const Editor = ({ id, value, onChange }) => {
  const f = FIELDS[id];
  if (f.type === "choice") {
    return (
      <div className="editor">
        <div className="editor-head"><span>{f.label}</span><span className="editor-drives">→ FORMULES</span></div>
        <div className="choices">
          {f.options.map(([val, lab]) => (
            <button key={val} className={`choice ${value === val ? "choice-on" : ""}`} onClick={() => onChange(val)}>
              {lab}
            </button>
          ))}
        </div>
        <p className="editor-note">
          Utilisé pour la masse grasse, la masse maigre, le métabolisme de base,
          les seuils de tour de taille et les normes de VO2 max.
        </p>
      </div>
    );
  }
  if (f.auto) {
    return (
      <div className="editor">
        <div className="editor-head"><span>{f.label}</span><span className="editor-drives">→ {DRIVES[id]}</span></div>
        <p className="editor-note">Valeur calculée par le module correspondant. Non modifiable ici.</p>
      </div>
    );
  }
  return (
    <div className="editor">
      <div className="editor-head">
        <span>{f.label}</span>
        {DRIVES[id] && <span className="editor-drives">→ {DRIVES[id]}</span>}
      </div>
      <div className="editor-ctrl">
        <button onClick={() => onChange(clamp((has(value) ? value : f.min) - f.step, f.min, f.max))}>–</button>
        <NumInput id={id} value={value} onChange={onChange} />
        <button onClick={() => onChange(clamp((has(value) ? value : f.min) + f.step, f.min, f.max))}>+</button>
      </div>
      {has(value) && (
        <input className="slide" type="range" min={f.min} max={f.max} step={f.step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))} />
      )}
    </div>
  );
};

const StatRow = ({ id, value, active, onSelect }) => (
  <button className={`stat ${active ? "stat-on" : ""} ${has(value) ? "" : "stat-void"}`}
    onClick={() => onSelect(active ? null : id)}>
    <span className="stat-name">{FIELDS[id].label}</span>
    <span className="stat-val">{showVal(id, value)}<i className="stat-unit">{has(value) ? FIELDS[id].unit : ""}</i></span>
    <span className="stat-track"><i style={{ width: `${norm(id, value) * 100}%` }} /></span>
  </button>
);

const FieldRow = ({ id, value, open, onToggle, onChange }) => (
  <div className={`frow ${open ? "frow-on" : ""}`}>
    <button className="frow-head" onClick={onToggle}>
      <span className="frow-label">{FIELDS[id].label}</span>
      <span className={`frow-val ${has(value) ? "" : "void"}`}>
        {showVal(id, value)}<i>{has(value) ? FIELDS[id].unit || "" : ""}</i>
      </span>
    </button>
    {open && <Editor id={id} value={value} onChange={onChange} />}
  </div>
);

const Tile = ({ label, value, unit, status, note, wide }) => (
  <div className={`tile st-${status || "off"} ${wide ? "tile-wide" : ""}`}>
    <span className="tile-label">{label}</span>
    <span className="tile-value">{value}<i>{value === "—" ? "" : unit}</i></span>
    {note && <span className="tile-note">{note}</span>}
  </div>
);

const PlanCard = ({ item, onOpen }) => (
  <button className={`card acc-${item.accent}`} onClick={onOpen}>
    <span className="card-bar" />
    <span className="card-top">
      <span className="card-glyph"><Glyph name={item.id} /></span>
      <span className="card-code">{item.code}</span>
    </span>
    <span className="card-name">{item.name}</span>
    <span className="card-desc">{item.desc}</span>
    <span className="card-state">{item.ready ? "ACTIF" : "HORS LIGNE"}</span>
  </button>
);

/* ============================================================
   INITIALISATION — première ouverture
   ============================================================ */
const Init = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({});
  const id = REQUIS[step];
  const f = FIELDS[id];
  const val = draft[id];
  const valide = f.type === "choice" ? has(val) : has(val) && val >= f.min && val <= f.max;
  const last = step === REQUIS.length - 1;

  const set = (x) => setDraft((d) => ({ ...d, [id]: x }));
  const next = () => (last ? onDone(draft) : setStep(step + 1));

  return (
    <div className="init">
      <div className="init-top">
        <div className="brand">HEALTH<i>//</i>OS</div>
        <div className="init-ticks">
          {REQUIS.map((_, i) => <span key={i} className={i <= step ? "on" : ""} />)}
        </div>
      </div>

      <div className="init-body">
        <div className="init-kicker">INITIALISATION DU SHELL · {step + 1} / {REQUIS.length}</div>
        <h1 className="init-q">{f.label}</h1>
        <p className="init-help">
          {id === "sexe" && "Détermine les formules de composition corporelle et les barèmes de référence."}
          {id === "age" && "Sert au métabolisme de base, à la fréquence cardiaque maximale et aux normes de VO2 max."}
          {id === "taille" && `En centimètres, entre ${f.min} et ${f.max}.`}
          {id === "poids" && `En kilogrammes. Modifiable à tout moment depuis Stats physique.`}
        </p>

        {f.type === "choice" ? (
          <div className="choices init-choices">
            {f.options.map(([v2, lab]) => (
              <button key={v2} className={`choice ${val === v2 ? "choice-on" : ""}`} onClick={() => set(v2)}>{lab}</button>
            ))}
          </div>
        ) : (
          <NumInput id={id} value={has(val) ? val : null} onChange={set} autoFocus />
        )}
      </div>

      <div className="init-foot">
        {step > 0 && <button className="init-back" onClick={() => setStep(step - 1)}>◄ PRÉCÉDENT</button>}
        <button className="init-next" disabled={!valide} onClick={next}>
          {last ? "DÉMARRER LE SHELL" : "SUIVANT ►"}
        </button>
        <p className="init-note">
          {valide
            ? "Le reste des mesures se renseigne plus tard, module par module."
            : f.type === "choice"
              ? "Choisis une option pour continuer."
              : `Entre une valeur entre ${f.min} et ${f.max} ${f.unit.toLowerCase()}.`}
        </p>
      </div>
    </div>
  );
};

/* ============================================================
   MODULE STATS PHYSIQUE
   ============================================================ */
const Physique = ({ S, set }) => {
  const v = S.v;
  const [open, setOpen] = useState(null);
  const a = useMemo(() => analyse(v), [v]);
  const remplis = Object.keys(FIELDS).filter((k) => !FIELDS[k].auto && has(v[k])).length;
  const total = Object.keys(FIELDS).filter((k) => !FIELDS[k].auto).length;

  return (
    <>
      <div className="phys-head">
        <div className="phys-preview"><Shell S={S} compact uid="mini" /></div>
        <div className="phys-summary">
          <div className="ps-big">{fmt(a.imc, 1)}</div>
          <div className="ps-lab">INDICE DE MASSE CORPORELLE</div>
          <div className={`ps-tag st-${a.imcStat}`}>{a.imcTxt}</div>
          <div className="ps-line">
            {has(v.sexe) ? (v.sexe === "H" ? "HOMME" : "FEMME") : "—"} · {showVal("age", v.age)} ANS ·
            {" "}{showVal("taille", v.taille)} CM · {showVal("poids", v.poids)} KG
          </div>
          <div className="ps-line">MESURES {remplis} / {total}</div>
        </div>
      </div>

      {PHYS_GROUPS.map((g) => (
        <section key={g.label}>
          <Rule label={g.label} right={g.code} />
          <div className="frows">
            {g.fields.map((id) => (
              <FieldRow key={id} id={id} value={v[id]} open={open === id}
                onToggle={() => setOpen(open === id ? null : id)} onChange={(x) => set(id, x)} />
            ))}
          </div>
        </section>
      ))}

      <section>
        <Rule label="ANALYSE" right="DÉRIVÉ" />
        <div className="tiles">
          <Tile label="MASSE GRASSE" value={fmt(a.bf, 1)} unit="%" status={a.bfStat} note={a.bfTxt} />
          <Tile label="MASSE MAIGRE" value={fmt(a.lbm, 1)} unit="KG" status={a.lbm == null ? "off" : "ok"}
            note={a.lbm == null ? "POIDS + TAILLE REQUIS" : a.estimeBf ? "ESTIMÉE (BOER)" : "SUR MESURES"} />
          <Tile label="MÉTABOLISME BASE" value={a.mb == null ? "—" : Math.round(a.mb)} unit="KCAL"
            status={a.mb == null ? "off" : "ok"} note="AU REPOS / 24H" />
          <Tile label="FC MAX THÉORIQUE" value={a.fcMax == null ? "—" : a.fcMax} unit="BPM"
            status={a.fcMax == null ? "off" : "ok"}
            note={a.reserve == null ? "FC REPOS MANQUANTE" : `RÉSERVE ${a.reserve}`} />
          <Tile label="TAILLE / HANCHES" value={fmt(a.whr, 2)} unit="" status={a.whrStat}
            note={has(v.sexe) ? `SEUIL ${v.sexe === "H" ? "0.90" : "0.80"}` : "SEUIL SELON SEXE"} />
          <Tile label="TAILLE / STATURE" value={fmt(a.whtr, 2)} unit="" status={a.whtrStat} note="SEUIL 0.50" />
          <Tile label="VO2 MAX" value={showVal("vo2", v.vo2)} unit="" status={a.vo2Stat}
            note={a.seuil == null ? a.vo2Txt : `${a.vo2Txt} · NORME ${a.seuil}`} />
          <Tile label="ASYMÉTRIE BRAS" value={fmt(a.asym, 1)} unit="%" status={a.asymStat}
            note={a.asym == null ? "DEUX BRAS REQUIS" : a.asymStat === "ok" ? "ÉQUILIBRÉ" : "À SURVEILLER"} />
          <Tile wide label="TENSION ARTÉRIELLE"
            value={has(v.tensionS) && has(v.tensionD) ? `${v.tensionS}/${v.tensionD}` : "—"} unit="MMHG"
            status={a.tenStat}
            note={a.tenStat === "off" ? "NON RENSEIGNÉE" : a.tenStat === "ok" ? "OPTIMALE"
              : a.tenStat === "mid" ? "LIMITE HAUTE" : "ÉLEVÉE"} />
        </div>
        <p className="disclaimer">
          Valeurs estimées par formules de terrain (Navy, Boer, Katch-McArdle, Tanaka).
          Compter 3 à 5 points d'écart sur la masse grasse par rapport à une mesure en laboratoire.
          Ce ne sont pas des indicateurs médicaux.
        </p>
      </section>
    </>
  );
};

/* ============================================================
   MODULE GAINAGE
   ============================================================ */
const Gainage = ({ data, onSave }) => {
  const log = data.log || [];
  const records = useMemo(() => {
    const r = {};
    for (const e of log) {
      const id = VAR_BY_ID[e.v] ? e.v : VAR_LEGACY[e.v];
      if (id) r[id] = Math.max(r[id] || 0, e.s);
    }
    return r;
  }, [log]);

  const ouvert = (V) => !V.unlock || (records[V.unlock.v] || 0) >= V.unlock.s;
  const [vid, setVid] = useState("ventral");
  const V = VAR_BY_ID[vid];
  const rec = records[vid] || 0;
  const palier = V.paliers.filter((p) => p <= rec).length;
  const prouesse = rec >= V.max;
  const suivant = V.paliers[palier] ?? null;

  const [ms, setMs] = useState(0);
  const [run, setRun] = useState(false);
  const t0 = useRef(0);

  useEffect(() => {
    if (!run) return;
    t0.current = Date.now() - ms;
    const i = setInterval(() => setMs(Date.now() - t0.current), 87);
    return () => clearInterval(i);
  }, [run]);

  const sec = Math.floor(ms / 1000);
  const cible = suivant ?? V.max;
  const progress = clamp(sec / cible, 0, 1);
  const liveProof = sec >= V.max;

  const stop = () => {
    setRun(false);
    if (sec >= 1) onSave({ d: Date.now(), s: sec, v: vid });
    setMs(0);
  };

  const choisir = (x) => { if (!run && ouvert(x)) { setVid(x.id); setMs(0); } };

  return (
    <>
      <div className={`gg-head ${prouesse ? "proof" : ""}`}>
        <div className="gg-palier">
          <span className="gg-plabel">{V.name}</span>
          <span className="gg-pnum">{String(palier).padStart(2, "0")}</span>
          <span className="gg-ptot">/ 10</span>
          {prouesse && <span className="gg-proof">PROUESSE</span>}
        </div>

        <div className="gg-blocks">
          {V.paliers.map((p, i) => (
            <span key={p} className={`gg-block${i < palier ? " on" : ""}${i === palier ? " next" : ""}${run && sec >= p ? " hit" : ""}`}>
              <b>{fmtSec(p)}</b>
              <i>{String(i + 1).padStart(2, "0")}</i>
            </span>
          ))}
        </div>

        <div className="gg-next">
          {prouesse ? `PLAFOND ${fmtSec(V.max)} ATTEINT`
            : suivant ? `PROCHAIN PALIER À ${fmtSec(suivant)}` : "—"}
          {rec > 0 && ` · RECORD ${fmtSec(rec)}`}
        </div>
      </div>

      <Rule label="VARIANTE" right={`${VARIANTES.filter(ouvert).length} / ${VARIANTES.length}`} />
      <div className="gg-vars">
        {VARIANTES.map((x) => {
          const open = ouvert(x);
          const r = records[x.id] || 0;
          const pr = r >= x.max;
          return (
            <button key={x.id}
              className={`gg-var${vid === x.id ? " on" : ""}${open ? "" : " lock"}${pr ? " proof" : ""}`}
              onClick={() => choisir(x)}>
              <span className="gg-var-n">{x.name}{x.tag && <em>{x.tag}</em>}</span>
              <span className="gg-var-r">
                {open ? (r > 0 ? `${fmtSec(r)} / ${fmtSec(x.max)}` : `PLAFOND ${fmtSec(x.max)}`)
                  : `REQUIS : ${VAR_BY_ID[x.unlock.v].name} ${fmtSec(x.unlock.s)}`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="gg-timer">
        <div className={`gg-time${run ? " live" : ""}${liveProof ? " proof" : ""}`}>{chrono(ms)}</div>
        <div className={`gg-bar${liveProof ? " proof" : ""}`}><i style={{ width: `${progress * 100}%` }} /></div>
        <div className="gg-target">
          {liveProof ? "PLAFOND DÉPASSÉ" : `OBJECTIF ${fmtSec(cible)}`}
        </div>
        {!run
          ? <button className="gg-go" onClick={() => setRun(true)}>DÉMARRER · {V.name}</button>
          : <button className="gg-go gg-stop" onClick={stop}>ARRÊTER ET ENREGISTRER</button>}
      </div>

      <Rule label="HISTORIQUE" right={`${log.length}`} />
      {log.length === 0 ? (
        <div className="empty"><p>Aucune tenue enregistrée.</p>
          <p className="empty-sub">Chaque variante garde son propre record et sa propre échelle de paliers.</p></div>
      ) : (
        <div className="frows">
          {[...log].reverse().slice(0, 40).map((e) => {
            const id = VAR_BY_ID[e.v] ? e.v : VAR_LEGACY[e.v];
            const ref = VAR_BY_ID[id];
            return (
              <div className="lrow" key={e.d}>
                <span className="lrow-d">{dateFr(e.d)}</span>
                <span className="lrow-v">{ref ? ref.name : e.v}</span>
                <span className={`lrow-s${ref && e.s >= ref.max ? " proof" : e.s >= (records[id] || 0) ? " rec" : ""}`}>
                  {fmtSec(e.s)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

/* ============================================================
   MODULE PERFORMANCES — records de répétitions
   ============================================================ */
const Perfs = ({ data, onSave }) => {
  const log = data.log || [];
  const records = useMemo(() => {
    const r = {};
    for (const e of log) if (EXO_BY_ID[e.e]) r[e.e] = Math.max(r[e.e] || 0, e.r);
    return r;
  }, [log]);

  const ouvert = (X) => !X.unlock || (records[X.unlock.e] || 0) >= X.unlock.r;
  const [eid, setEid] = useState("pompes");
  const E = EXO_BY_ID[eid];
  const rec = records[eid] || 0;
  const palier = E.paliers.filter((p) => p <= rec).length;
  const prouesse = rec >= E.max;
  const suivant = E.paliers[palier] ?? null;
  const cible = suivant ?? E.max;
  const progress = clamp(rec / cible, 0, 1);

  const [saisie, setSaisie] = useState("");
  const n = parseInt(saisie, 10);
  const valide = !isNaN(n) && n > 0;
  const bat = valide && n > rec;

  const enregistrer = () => { onSave({ d: Date.now(), e: eid, r: n }); setSaisie(""); };
  const bump = (d) => setSaisie(String(Math.max(1, (isNaN(n) ? 0 : n) + d)));

  return (
    <>
      <div className={`gg-head ${prouesse ? "proof" : ""}`}>
        <div className="gg-palier">
          <span className="gg-plabel">{E.name}</span>
          <span className="gg-pnum">{String(palier).padStart(2, "0")}</span>
          <span className="gg-ptot">/ 10</span>
          {prouesse && <span className="gg-proof">PROUESSE</span>}
        </div>

        <div className="gg-blocks">
          {E.paliers.map((p, i) => (
            <span key={p} className={`gg-block${i < palier ? " on" : ""}${i === palier ? " next" : ""}${valide && n >= p && i >= palier ? " hit" : ""}`}>
              <b>{p}</b>
              <i>{String(i + 1).padStart(2, "0")}</i>
            </span>
          ))}
        </div>

        <div className="gg-next">
          {prouesse ? `PLAFOND ${E.max} REP ATTEINT`
            : suivant ? `PROCHAIN PALIER À ${suivant} REP` : "—"}
          {rec > 0 && ` · RECORD ${rec}`}
        </div>
      </div>

      <Rule label="MOUVEMENT" right={`${EXOS.filter(ouvert).length} / ${EXOS.length}`} />
      <div className="gg-vars">
        {EXOS.map((x) => {
          const open = ouvert(x);
          const r = records[x.id] || 0;
          const pr = r >= x.max;
          return (
            <button key={x.id}
              className={`gg-var${eid === x.id ? " on" : ""}${open ? "" : " lock"}${pr ? " proof" : ""}`}
              onClick={() => { if (open) { setEid(x.id); setSaisie(""); } }}>
              <span className="gg-var-n">{x.name}{x.tag && <em>{x.tag}</em>}</span>
              <span className="gg-var-r">
                {open ? (r > 0 ? `${r} / ${x.max} REP` : `PLAFOND ${x.max} REP`)
                  : `REQUIS : ${EXO_BY_ID[x.unlock.e].name} ${x.unlock.r}`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="gg-timer">
        <div className={`pf-rec${prouesse ? " proof" : ""}`}>{rec || "—"}<i>REP · RECORD</i></div>
        <div className={`gg-bar${prouesse ? " proof" : ""}`}><i style={{ width: `${progress * 100}%` }} /></div>
        <div className="gg-target">{prouesse ? "PLAFOND ATTEINT" : `OBJECTIF ${cible} REP`}</div>

        <div className="pf-entry">
          <button onClick={() => bump(-1)}>–</button>
          <div className="numwrap">
            <input className="numin" type="number" inputMode="numeric" placeholder="0"
              value={saisie} onChange={(e) => setSaisie(e.target.value)} />
            <span className="numunit">REP</span>
          </div>
          <button onClick={() => bump(1)}>+</button>
        </div>

        <button className="gg-go" disabled={!valide} onClick={enregistrer}>
          {bat ? "NOUVEAU RECORD · ENREGISTRER" : "ENREGISTRER LA SÉRIE"}
        </button>
      </div>

      <Rule label="HISTORIQUE" right={`${log.length}`} />
      {log.length === 0 ? (
        <div className="empty"><p>Aucune série enregistrée.</p>
          <p className="empty-sub">Une série menée à l'échec, en forme stricte. Chaque mouvement garde son propre record.</p></div>
      ) : (
        <div className="frows">
          {[...log].reverse().slice(0, 40).map((e) => {
            const ref = EXO_BY_ID[e.e];
            return (
              <div className="lrow" key={e.d}>
                <span className="lrow-d">{dateFr(e.d)}</span>
                <span className="lrow-v">{ref ? ref.name : e.e}</span>
                <span className={`lrow-s${ref && e.r >= ref.max ? " proof" : e.r >= (records[e.e] || 0) ? " rec" : ""}`}>
                  {e.r}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

/* ============================================================
   SCHÉMAS DE MOUVEMENT
   ============================================================ */
const Pose = ({ name }) => {
  const s = { stroke: "var(--live)", fill: "none", strokeWidth: 5, strokeLinecap: "round" };
  const d = { fill: "var(--live)" };
  const poses = {
    push: (<>
      <circle cx="26" cy="52" r="7" {...d} />
      <path d="M34 54 L92 62" {...s} />
      <path d="M40 55 L38 76" {...s} />
      <path d="M86 61 L88 76" {...s} />
      <path d="M12 78 L110 78" stroke="var(--ash)" strokeWidth="2" />
    </>),
    squat: (<>
      <circle cx="60" cy="16" r="7" {...d} />
      <path d="M60 24 L60 46" {...s} />
      <path d="M60 46 L44 58 L46 76" {...s} />
      <path d="M60 46 L76 58 L74 76" {...s} />
      <path d="M60 30 L88 26" {...s} />
      <path d="M12 78 L110 78" stroke="var(--ash)" strokeWidth="2" />
    </>),
    pull: (<>
      <path d="M14 14 L106 14" stroke="var(--ash)" strokeWidth="3" />
      <circle cx="60" cy="30" r="7" {...d} />
      <path d="M48 15 L58 28" {...s} />
      <path d="M72 15 L62 28" {...s} />
      <path d="M60 37 L60 62" {...s} />
      <path d="M60 62 L52 80 M60 62 L68 80" {...s} />
    </>),
    leg: (<>
      <path d="M14 14 L106 14" stroke="var(--ash)" strokeWidth="3" />
      <circle cx="60" cy="30" r="7" {...d} />
      <path d="M52 15 L58 26 M68 15 L62 26" {...s} />
      <path d="M60 37 L60 58" {...s} />
      <path d="M60 58 L92 50" {...s} />
      <path d="M60 58 L92 62" {...s} />
    </>),
    bridge: (<>
      <path d="M28 74 C34 24, 86 24, 92 74" {...s} />
      <circle cx="60" cy="36" r="6" {...d} />
      <path d="M28 74 L26 80 M92 74 L94 80" {...s} />
      <path d="M12 80 L110 80" stroke="var(--ash)" strokeWidth="2" />
    </>),
    hs: (<>
      <circle cx="60" cy="62" r="7" {...d} />
      <path d="M60 54 L60 24" {...s} />
      <path d="M60 24 L50 12 M60 24 L70 12" {...s} />
      <path d="M52 72 L68 72" {...s} />
      <path d="M12 78 L110 78" stroke="var(--ash)" strokeWidth="2" />
    </>),
  };
  return (
    <svg viewBox="0 0 120 92" width="100%" height="100%" aria-hidden="true">{poses[name]}</svg>
  );
};

/* ============================================================
   MODULE CONVICT CONDITIONING
   ============================================================ */
const fmtStd = (st, s) => `${s[0]} × ${s[1]}${st.t ? '"' : ""}`;

const Convict = ({ S, onLog, onLevel, onRythme }) => {
  const niveaux = S.cc.steps;
  const log = S.cc.log || [];
  const R = RYTHMES.find((x) => x.id === S.cc.rythme) || RYTHMES[0];
  const [ouvert, setOuvert] = useState(null);
  const [info, setInfo] = useState(null);
  const [saisie, setSaisie] = useState({});

  const auj = new Date().getDay();
  const [jour, setJour] = useState(auj);
  const duJour = R.jours[jour] || [];

  /* meilleure prestation enregistrée sur un palier donné */
  const best = (c, i) => log.filter((e) => e.c === c && e.st === i)
    .reduce((m, e) => (e.sets * 1000 + e.reps > m.sets * 1000 + m.reps ? { sets: e.sets, reps: e.reps } : m),
      { sets: 0, reps: 0 });
  const atteint = (b, s) => b.sets >= s[0] && b.reps >= s[1];
  const rang = (c, i) => {
    const st = CC_BY_ID[c].steps[i], b = best(c, i);
    for (let k = 0; k < 3; k++) if (!atteint(b, st.std[k])) return k;
    return 3;
  };

  const valider = (c) => {
    const i = (niveaux[c] || 1) - 1;
    const st = CC_BY_ID[c].steps[i];
    const cible = st.std[Math.min(rang(c, i), 2)];
    const sv = saisie[c] || {};
    const sets = parseInt(sv.sets, 10) || cible[0];
    const reps = parseInt(sv.reps, 10) || cible[1];
    onLog({ d: Date.now(), c, st: i, sets, reps });
    setSaisie((x) => ({ ...x, [c]: {} }));
  };

  return (
    <>
      <Rule label="RYTHME" right={JOURS[auj]} />
      <div className="cc-rythmes">
        {RYTHMES.map((x) => (
          <button key={x.id} className={`cc-ry${S.cc.rythme === x.id ? " on" : ""}`} onClick={() => onRythme(x.id)}>
            <span className="cc-ry-n">{x.name}</span>
            <span className="cc-ry-s">{x.sub}</span>
            <span className="cc-ry-week">
              {[1, 2, 3, 4, 5, 6, 0].map((j) => (
                <i key={j} className={x.jours[j] ? "on" : ""}>{JOURS[j][0]}</i>
              ))}
            </span>
          </button>
        ))}
      </div>

      <Rule label={jour === auj ? "ENTRAÎNEMENT DU JOUR" : "SÉANCE PROGRAMMÉE"}
        right={duJour.length ? `${duJour.length} CHAÎNES` : "REPOS"} />
      <div className="cc-days">
        {[1, 2, 3, 4, 5, 6, 0].map((j) => (
          <button key={j}
            className={`cc-day${j === jour ? " sel" : ""}${R.jours[j] ? " actif" : ""}${j === auj ? " auj" : ""}`}
            onClick={() => setJour(j)}>{JOURS[j].slice(0, 3)}</button>
        ))}
      </div>

      {duJour.length === 0 ? (
        <div className="empty"><p>{jour === auj ? "Jour de repos." : "Aucune séance ce jour-là."}</p>
          <p className="empty-sub">Rythme {R.name}. La récupération fait partie du programme.</p></div>
      ) : duJour.map((c) => {
        const chain = CC_BY_ID[c];
        const i = (niveaux[c] || 1) - 1;
        const st = chain.steps[i];
        const rg = rang(c, i);
        const cible = st.std[Math.min(rg, 2)];
        const fini = rg === 3;
        const sv = saisie[c] || {};
        return (
          <div key={c} className={`cc-today${fini ? " done" : ""}`}>
            <div className="cc-today-top">
              <span className="cc-today-chain">{chain.name}</span>
              <span className="cc-today-lvl">PALIER {String(i + 1).padStart(2, "0")} / 10</span>
            </div>
            <div className="cc-today-step">{st.n}{st.side ? " · PAR CÔTÉ" : ""}</div>
            <div className="cc-today-goal">
              <span className="cc-goal-lab">{fini ? "PALIER VALIDÉ" : `OBJECTIF ${CC_STD[rg]}`}</span>
              <span className="cc-goal-val">{fmtStd(st, cible)}</span>
            </div>

            {fini ? (
              <button className="cc-up" onClick={() => onLevel(c, i + 2)}>
                PASSER AU PALIER {String(i + 2).padStart(2, "0")} ►
              </button>
            ) : (
              <div className="cc-entry">
                <div className="numwrap">
                  <input className="numin" type="number" inputMode="numeric" placeholder={String(cible[0])}
                    value={sv.sets ?? ""} onChange={(e) => setSaisie((x) => ({ ...x, [c]: { ...sv, sets: e.target.value } }))} />
                  <span className="numunit">SÉRIES</span>
                </div>
                <div className="numwrap">
                  <input className="numin" type="number" inputMode="numeric" placeholder={String(cible[1])}
                    value={sv.reps ?? ""} onChange={(e) => setSaisie((x) => ({ ...x, [c]: { ...sv, reps: e.target.value } }))} />
                  <span className="numunit">{st.t ? "SEC" : "REP"}</span>
                </div>
                <button className="cc-ok" onClick={() => valider(c)}>OK</button>
              </div>
            )}
          </div>
        );
      })}

      <Rule label="LES SIX CHAÎNES" right={`${CC.length}`} />
      <div className="cc-chains">
        {CC.map((chain) => {
          const i = (niveaux[chain.id] || 1) - 1;
          const rg = rang(chain.id, i);
          const est = ouvert === chain.id;
          return (
            <div key={chain.id} className={`cc-chain${est ? " open" : ""}`}>
              <button className="cc-chain-head" onClick={() => setOuvert(est ? null : chain.id)}>
                <span className="cc-chain-pose"><Pose name={chain.pose} /></span>
                <span className="cc-chain-txt">
                  <span className="cc-chain-n">{chain.name}</span>
                  <span className="cc-chain-s">{chain.steps[i].n}</span>
                </span>
                <span className="cc-chain-lvl">{String(i + 1).padStart(2, "0")}</span>
              </button>
              <span className="cc-chain-bar">
                <i style={{ width: `${((i + Math.min(rg, 3) / 3) / 10) * 100}%` }} />
              </span>

              {est && (
                <div className="cc-steps">
                  {chain.steps.map((st, k) => (
                    <div key={k} className={`cc-step${k === i ? " cur" : ""}${k < i ? " done" : ""}`}>
                      <button className="cc-step-main" onClick={() => onLevel(chain.id, k + 1)}>
                        <span className="cc-step-i">{String(k + 1).padStart(2, "0")}</span>
                        <span className="cc-step-n">{st.n}</span>
                        <span className="cc-step-std">{fmtStd(st, st.std[2])}</span>
                      </button>
                      <button className="cc-step-info" onClick={() => setInfo({ c: chain.id, k })}>?</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {info && (() => {
        const chain = CC_BY_ID[info.c], st = chain.steps[info.k];
        return (
          <div className="cc-modal" onClick={() => setInfo(null)}>
            <div className="cc-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="cc-sheet-top">
                <span>{chain.name} · PALIER {String(info.k + 1).padStart(2, "0")}</span>
                <button onClick={() => setInfo(null)}>FERMER ✕</button>
              </div>
              <div className="cc-sheet-pose"><Pose name={chain.pose} /></div>
              <div className="cc-sheet-n">{st.n}</div>
              <p className="cc-sheet-d">{st.d}{st.side ? " Chaque côté compté séparément." : ""}</p>
              <div className="cc-sheet-std">
                {st.std.map((s, k) => (
                  <div key={k} className="cc-sheet-row">
                    <span>{CC_STD[k]}</span><b>{fmtStd(st, s)}</b>
                  </div>
                ))}
              </div>
              <a className="cc-sheet-link" target="_blank" rel="noreferrer"
                href={`https://duckduckgo.com/?iax=images&ia=images&q=${encodeURIComponent(st.n + " convict conditioning")}`}>
                VOIR DES PHOTOS DU MOUVEMENT ↗
              </a>
            </div>
          </div>
        );
      })()}

      <Rule label="JOURNAL" right={`${log.length}`} />
      {log.length === 0 ? (
        <div className="empty"><p>Aucune séance enregistrée.</p></div>
      ) : (
        <div className="frows">
          {[...log].reverse().slice(0, 40).map((e) => {
            const chain = CC_BY_ID[e.c];
            return (
              <div className="lrow" key={e.d}>
                <span className="lrow-d">{dateFr(e.d)}</span>
                <span className="lrow-v">{chain ? `${chain.name} · P${String(e.st + 1).padStart(2, "0")}` : e.c}</span>
                <span className="lrow-s">{e.sets}×{e.reps}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

/* ============================================================
   MODULE SALLE — séances structurées, charges et séries
   ============================================================ */
const Salle = ({ data, onSave, jourSeance }) => {
  const log = data.log || [];
  const [sid, setSid] = useState(jourSeance || "A");
  const S3 = MUSCU_BY_ID[sid];
  const [saisie, setSaisie] = useState({});

  /* dernière charge enregistrée pour un exercice : repère de surcharge progressive */
  const dernier = (nom) => {
    for (let k = log.length - 1; k >= 0; k--) {
      if (log[k].s !== sid) continue;
      const f = (log[k].ex || []).find((x) => x.n === nom);
      if (f) return f;
    }
    return null;
  };

  const enregistrer = () => {
    const ex = S3.ex.map((e) => {
      const v = saisie[e.n] || {};
      const d = dernier(e.n);
      return { n: e.n, kg: parseFloat(v.kg) || (d ? d.kg : 0), r: parseInt(v.r, 10) || (d ? d.r : e.r) };
    }).filter((x) => x.kg > 0 || x.r > 0);
    if (!ex.length) return;
    onSave({ d: Date.now(), s: sid, ex });
    setSaisie({});
  };

  const faites = log.filter((e) => e.s === sid).length;

  return (
    <>
      <Rule label="SÉANCE" right={`${log.length} AU TOTAL`} />
      <div className="gg-vars">
        {MUSCU_SEANCES.map((x) => (
          <button key={x.id} className={`gg-var${sid === x.id ? " on" : ""}`}
            onClick={() => { setSid(x.id); setSaisie({}); }}>
            <span className="gg-var-n">SÉANCE {x.id}</span>
            <span className="gg-var-r">{x.name}</span>
          </button>
        ))}
      </div>

      <Rule label={S3.name} right={`${faites} RÉALISÉE${faites > 1 ? "S" : ""}`} />
      <div className="sl-list">
        {S3.ex.map((e) => {
          const d = dernier(e.n);
          const v = saisie[e.n] || {};
          return (
            <div className="sl-ex" key={e.n}>
              <div className="sl-ex-top">
                <span className="sl-ex-n">{e.n}</span>
                <span className="sl-ex-t">{e.s} × {e.r}</span>
              </div>
              <div className="sl-ex-in">
                <div className="numwrap">
                  <input className="numin" type="number" inputMode="decimal"
                    placeholder={d ? String(d.kg) : "0"} value={v.kg ?? ""}
                    onChange={(ev) => setSaisie((x) => ({ ...x, [e.n]: { ...v, kg: ev.target.value } }))} />
                  <span className="numunit">KG</span>
                </div>
                <div className="numwrap">
                  <input className="numin" type="number" inputMode="numeric"
                    placeholder={d ? String(d.r) : String(e.r)} value={v.r ?? ""}
                    onChange={(ev) => setSaisie((x) => ({ ...x, [e.n]: { ...v, r: ev.target.value } }))} />
                  <span className="numunit">REP</span>
                </div>
              </div>
              {d && <div className="sl-ex-last">DERNIÈRE FOIS · {d.kg} KG × {d.r}</div>}
            </div>
          );
        })}
      </div>
      <button className="gg-go sl-go" onClick={enregistrer}>ENREGISTRER LA SÉANCE {sid}</button>

      <Rule label="HISTORIQUE" right={`${log.length}`} />
      {log.length === 0 ? (
        <div className="empty"><p>Aucune séance enregistrée.</p>
          <p className="empty-sub">Les charges saisies servent de repère à la séance suivante.</p></div>
      ) : (
        <div className="frows">
          {[...log].reverse().slice(0, 30).map((e) => (
            <div className="lrow" key={e.d}>
              <span className="lrow-d">{dateFr(e.d)}</span>
              <span className="lrow-v">SÉANCE {e.s} · {MUSCU_BY_ID[e.s] ? MUSCU_BY_ID[e.s].name : ""}</span>
              <span className="lrow-s">{(e.ex || []).length}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/* ============================================================
   MODULE ABDOS — circuits à niveaux
   ============================================================ */
const Abdos = ({ data, onDone }) => {
  const niv = clamp(data.niv || 1, 1, ABDOS_NIV.length);
  const tours = data.tours || 0;
  const log = data.log || [];
  const N = ABDOS_NIV[niv - 1];
  const sommet = niv === ABDOS_NIV.length && tours >= ABDOS_SEUIL;

  return (
    <>
      <div className={`gg-head ${sommet ? "proof" : ""}`}>
        <div className="gg-palier">
          <span className="gg-plabel">{N.n}</span>
          <span className="gg-pnum">{String(niv).padStart(2, "0")}</span>
          <span className="gg-ptot">/ {ABDOS_NIV.length}</span>
          {sommet && <span className="gg-proof">PROUESSE</span>}
        </div>
        <div className="gg-blocks ab-blocks">
          {ABDOS_NIV.map((x, i) => (
            <span key={x.n} className={`gg-block${i < niv - 1 ? " on" : ""}${i === niv - 1 ? " next" : ""}`}>
              <b>{String(i + 1).padStart(2, "0")}</b>
              <i>{x.n.slice(0, 5)}</i>
            </span>
          ))}
        </div>
        <div className="gg-next">
          {sommet ? "DERNIER CIRCUIT MAÎTRISÉ"
            : `${tours} / ${ABDOS_SEUIL} CIRCUITS AVANT LE NIVEAU ${String(niv + 1).padStart(2, "0")}`}
        </div>
      </div>

      <Rule label="CIRCUIT" right={`${N.tours} TOURS · ${N.repos} S DE REPOS`} />
      <div className="ab-ex">
        {N.ex.map((x, i) => (
          <div className="ab-row" key={x}>
            <span className="ab-i">{String(i + 1).padStart(2, "0")}</span>
            <span className="ab-n">{x}</span>
          </div>
        ))}
      </div>
      <p className="editor-note">
        Enchaîner les {N.ex.length} exercices sans pause, puis {N.repos} secondes de repos.
        {N.tours} tours au total. Arrêter une série dès que la position se dégrade.
      </p>
      <button className="gg-go ab-go" onClick={() => onDone()}>CIRCUIT TERMINÉ</button>

      <Rule label="HISTORIQUE" right={`${log.length}`} />
      {log.length === 0 ? (
        <div className="empty"><p>Aucun circuit enregistré.</p></div>
      ) : (
        <div className="frows">
          {[...log].reverse().slice(0, 30).map((e) => (
            <div className="lrow" key={e.d}>
              <span className="lrow-d">{dateFr(e.d)}</span>
              <span className="lrow-v">{ABDOS_NIV[e.niv - 1] ? ABDOS_NIV[e.niv - 1].n : ""}</span>
              <span className="lrow-s">N{String(e.niv).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/* ============================================================
   MODULE DUO — temporaire
   ============================================================ */
const Duo = ({ data, onSave, onToggle, jourSeance }) => {
  const log = data.log || [];
  const [sid, setSid] = useState(jourSeance || "D1");
  const D = DUO_BY_ID[sid];

  return (
    <>
      <div className={`duo-head${data.actif ? " on" : ""}`}>
        <div className="duo-head-top">
          <span>MODULE TEMPORAIRE</span>
          <button className={`duo-sw${data.actif ? " on" : ""}`} onClick={onToggle}>
            {data.actif ? "ACTIF" : "INACTIF"}
          </button>
        </div>
        <p className="duo-note">
          Tant qu'il est actif, la semaine type bascule sur le planning à deux : trois séances
          communes, deux cardio souples, un jour de repos. Désactive-le au retour pour
          retrouver le programme normal.
        </p>
      </div>

      <Rule label="SÉANCE" right={`${log.length} FAITES`} />
      <div className="gg-vars">
        {DUO_SEANCES.map((x) => (
          <button key={x.id} className={`gg-var${sid === x.id ? " on" : ""}`} onClick={() => setSid(x.id)}>
            <span className="gg-var-n">{x.id}</span>
            <span className="gg-var-r">{x.name}</span>
          </button>
        ))}
      </div>

      <Rule label={D.name} />
      <div className="sl-list">
        {D.ex.map((e) => (
          <div className="sl-ex" key={e.n}>
            <div className="sl-ex-top">
              <span className="sl-ex-n">{e.n}</span>
              <span className="sl-ex-t">{e.s} × {e.r}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="editor-note">
        Charges légères, machines guidées et poids de corps. Le but est la dépense et la
        qualité d'exécution, pas la charge. Deux minutes de repos entre les blocs, moins si
        le souffle revient vite.
      </p>
      <button className="gg-go duo-go" onClick={() => onSave({ d: Date.now(), s: sid })}>
        SÉANCE {sid} TERMINÉE
      </button>

      <Rule label="HISTORIQUE" right={`${log.length}`} />
      {log.length === 0 ? (
        <div className="empty"><p>Aucune séance à deux enregistrée.</p></div>
      ) : (
        <div className="frows">
          {[...log].reverse().slice(0, 20).map((e) => (
            <div className="lrow" key={e.d}>
              <span className="lrow-d">{dateFr(e.d)}</span>
              <span className="lrow-v">{DUO_BY_ID[e.s] ? DUO_BY_ID[e.s].name : e.s}</span>
              <span className="lrow-s">✓</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/* ============================================================
   APPLICATION
   ============================================================ */
const CC_INIT = Object.fromEntries(CC.map((c) => [c.id, 1]));
const normalise = (p) => ({
  ...FRESH, ...p,
  v: { ...BLANK, ...((p && p.v) || {}) },
  cc: { ...FRESH.cc, ...((p && p.cc) || {}), steps: { ...CC_INIT, ...((p && p.cc && p.cc.steps) || {}) } },
  gainage: { log: (p && p.gainage && p.gainage.log) || [] },
  perfs: { log: (p && p.perfs && p.perfs.log) || [] },
  muscu: { log: (p && p.muscu && p.muscu.log) || [] },
  abdos: { ...FRESH.abdos, ...((p && p.abdos) || {}), log: (p && p.abdos && p.abdos.log) || [] },
  duo: { ...FRESH.duo, ...((p && p.duo) || {}), log: (p && p.duo && p.duo.log) || [] },
});

const FRESH = { v: BLANK, init: false, cc: { rythme: "new", steps: CC_INIT, log: [] },
  gainage: { log: [] }, perfs: { log: [] }, muscu: { log: [] },
  abdos: { niv: 1, tours: 0, log: [] }, duo: { actif: false, log: [] } };

function HealthOS() {
  const [S, setS] = useState(FRESH);
  const [sel, setSel] = useState(null);
  const [view, setView] = useState("dash");
  const [clock, setClock] = useState("--:--");
  const loaded = useRef(false);
  const [ready, setReady] = useState(false);
  const [panneau, setPanneau] = useState(false);
  const [sauve, setSauve] = useState(null);
  const [msg, setMsg] = useState(null);
  const [raz, setRaz] = useState(false);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const i = setInterval(tick, 20000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r && r.value) {
          setS(normalise(JSON.parse(r.value)));
        }
      } catch (e) { /* première ouverture */ }
      finally { loaded.current = true; setReady(true); }
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    (async () => {
      try { await window.storage.set(STORAGE_KEY, JSON.stringify(S)); setSauve(Date.now()); }
      catch (e) { setSauve(false); }
    })();
  }, [S]);

  const v = S.v;
  const set = (id, val) => setS((s) => ({ ...s, v: { ...s.v, [id]: val } }));

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(null), 4000); };

  const exporter = () => {
    try {
      const nom = `healthos-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = nom; document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      flash(`Fichier ${nom} téléchargé.`);
    } catch (e) { flash("Téléchargement impossible ici. Copie le texte affiché."); }
  };

  const importer = (file) => {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const p = JSON.parse(String(fr.result));
        if (!p || typeof p !== "object" || !p.v) throw new Error("format");
        setS(normalise(p)); flash("Données restaurées.");
      } catch (e) { flash("Fichier illisible. Attendu : un export HEALTH//OS."); }
    };
    fr.onerror = () => flash("Lecture du fichier impossible.");
    fr.readAsText(file);
  };

  const remettreAZero = () => {
    if (raz) { setS(FRESH); setRaz(false); setPanneau(false); }
    else { setRaz(true); setTimeout(() => setRaz(false), 5000); }
  };

  const finInit = (draft) => setS((s) => ({ ...s, init: true, v: { ...s.v, ...draft } }));

  const saveGainage = (entry) => setS((s) => {
    const log = [...(s.gainage.log || []), entry];
    // le rail du dashboard suit le ventral, référence commune du gainage
    const ventral = log.reduce(
      (m, e) => ((VAR_BY_ID[e.v] ? e.v : VAR_LEGACY[e.v]) === "ventral" ? Math.max(m, e.s) : m), 0);
    return { ...s, gainage: { ...s.gainage, log }, v: { ...s.v, gainage: ventral } };
  });

  const ccLog = (entry) => setS((s) => {
    const log = [...(s.cc.log || []), entry];
    const niveau = Math.max(...log.filter((e) => e.c === entry.c).map((e) => e.st + 1), s.cc.steps[entry.c] || 1);
    return { ...s, cc: { ...s.cc, log }, v: { ...s.v, convict: ccPourcent({ ...s.cc.steps, [entry.c]: niveau }) } };
  });
  const ccLevel = (c, n) => setS((s) => {
    const steps = { ...s.cc.steps, [c]: clamp(n, 1, 10) };
    return { ...s, cc: { ...s.cc, steps }, v: { ...s.v, convict: ccPourcent(steps) } };
  });
  const ccRythme = (id) => setS((s) => ({ ...s, cc: { ...s.cc, rythme: id } }));

  const savePerf = (entry) => setS((s) => {
    const log = [...(s.perfs.log || []), entry];
    const best = (id) => log.reduce((m, e) => (e.e === id ? Math.max(m, e.r) : m), 0);
    return {
      ...s, perfs: { ...s.perfs, log },
      v: { ...s.v, abdos: best("abdos"), tractions: best("tractions") },
    };
  });

  const saveSalle = (entry) => setS((s) => {
    const log = [...(s.muscu.log || []), entry];
    return { ...s, muscu: { ...s.muscu, log }, v: { ...s.v, muscu: log.length } };
  });

  const abdosDone = () => setS((s) => {
    const a = s.abdos;
    const log = [...(a.log || []), { d: Date.now(), niv: a.niv }];
    let niv = a.niv, tours = (a.tours || 0) + 1;
    if (tours >= ABDOS_SEUIL && niv < ABDOS_NIV.length) { niv += 1; tours = 0; }
    return { ...s, abdos: { niv, tours, log } };
  });

  const duoSave = (entry) => setS((s) => ({ ...s, duo: { ...s.duo, log: [...(s.duo.log || []), entry] } }));
  const duoToggle = () => setS((s) => ({ ...s, duo: { ...s.duo, actif: !s.duo.actif } }));

  const jour = new Date().getDay();
  const planning = S.duo.actif ? SEMAINE_DUO : SEMAINE;
  const duJour = planning[jour] || [{ t: "repos" }];
  /* le test du matin tourne sur les mouvements pour ne pas taper toujours le meme */
  const perfDuJour = PERF_ROTATION[(S.perfs.log.length) % PERF_ROTATION.length];

  const m = useMemo(() => shellMetrics(S), [S]);
  const a = useMemo(() => analyse(v), [v]);
  const col = integrityColor(m.integrity);
  const plan = PLANS.find((p) => p.id === view);
  const sub = SPORT_SUB.find((p) => p.id === view);

  if (!ready) return <div className="hos"><style>{CSS}</style></div>;

  if (!S.init) {
    return (
      <div className="hos" style={{ "--live": C.lime }}>
        <style>{CSS}</style>
        <Init onDone={finInit} />
      </div>
    );
  }

  const back = (to, label) => <button className="back" onClick={() => setView(to)}>◄ {label}</button>;

  return (
    <div className="hos" style={{ "--live": col }}>
      <style>{CSS}</style>

      <header className="topbar">
        <button className="brand brand-b"
          onClick={() => { setView("dash"); setSel(null); setPanneau(false); }}
          aria-label="Retour à l'accueil">HEALTH<i>//</i>OS</button>
        <div className="topmeta">
          <button className={`chip chip-b${panneau ? " on" : ""}`} onClick={() => setPanneau(!panneau)}>
            DONNÉES
          </button>
          <span className="clock">{clock}</span>
        </div>
      </header>

      {msg && <div className="flash">{msg}</div>}

      {panneau && (
        <div className="dpanel">
          <div className="dp-state">
            <span>{sauve === false ? "SAUVEGARDE AUTOMATIQUE INDISPONIBLE"
              : sauve ? `ENREGISTRÉ À ${new Date(sauve).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              : "AUCUNE ÉCRITURE DEPUIS L'OUVERTURE"}</span>
          </div>
          <p className="dp-note">
            Les données vivent dans le navigateur. Exporte un fichier avant toute mise à jour de l'app :
            il se réimporte tel quel et remplace l'état courant.
          </p>
          <button className="dp-btn" onClick={exporter}>EXPORTER UN FICHIER</button>
          <label className="dp-btn dp-in">
            IMPORTER UN FICHIER
            <input type="file" accept="application/json,.json"
              onChange={(e) => { importer(e.target.files && e.target.files[0]); e.target.value = ""; }} />
          </label>
          <button className={`dp-btn dp-raz${raz ? " armed" : ""}`} onClick={remettreAZero}>
            {raz ? "CONFIRMER L'EFFACEMENT ✕" : "TOUT EFFACER"}
          </button>
          <div className="dp-count">
            CONVICT {S.cc.log.length} · GAINAGE {S.gainage.log.length} ·
            PERFS {S.perfs.log.length} · MUSCU {S.muscu.log.length}
          </div>
        </div>
      )}

      {view === "dash" && (
        <main className="scroll">
          <section>
            <Rule label="SHELL" right={`INTÉGRITÉ ${Math.round(m.integrity * 100)}`} />
            <div className="gauges">
              <div className="gauge">
                <span className="gauge-l">FORCE</span>
                <span className="gauge-v">{Math.round(m.force * 100)}</span>
                <span className="gauge-t"><i style={{ width: `${m.force * 100}%` }} /></span>
              </div>
              <div className="gauge endu">
                <span className="gauge-l">ENDURANCE</span>
                <span className="gauge-v">{Math.round(m.endurance * 100)}</span>
                <span className="gauge-t"><i style={{ width: `${m.endurance * 100}%` }} /></span>
              </div>
            </div>
            <div className="hero-grid">
              <div className="rail">
                {RAIL.map((id) => (
                  <StatRow key={id} id={id} value={v[id]} active={sel === id} onSelect={setSel} />
                ))}
              </div>
              <div className="body">
                <Shell S={S} uid="main" />
                <div className="readout">
                  <div>IMC {fmt(a.imc, 1)} · MG {fmt(a.bf, 1)}%</div>
                  <div>TRONC {(m.core * 100).toFixed(0)} · HAUT {(m.upper * 100).toFixed(0)}</div>
                  <div>FLUX CARDIO {(m.cardio * 100).toFixed(0)}</div>
                  <div className="ok">SHELL STABLE</div>
                </div>
              </div>
            </div>
            {sel && <Editor id={sel} value={v[sel]} onChange={(x) => set(sel, x)} />}
          </section>

          <section>
            <Rule label="SÉANCE DU JOUR" right={JOURS[jour]} />
            {S.duo.actif && <div className="duo-flag">PLANNING DUO ACTIF · MODULE TEMPORAIRE</div>}
            <div className="pj">
              {duJour.map((b, k) => {
                const B = BLOCS[b.t];
                const detail = b.t === "muscu" ? MUSCU_BY_ID[b.s].name
                  : b.t === "duo" ? DUO_BY_ID[b.s].name
                  : b.t === "perf" ? `TEST ${EXO_BY_ID[perfDuJour].name}`
                  : b.t === "abdos" ? ABDOS_NIV[clamp(S.abdos.niv, 1, ABDOS_NIV.length) - 1].n
                  : b.t === "cc" ? ((RYTHMES.find((r) => r.id === S.cc.rythme) || RYTHMES[0]).jours[jour] || [])
                      .map((c) => CC_BY_ID[c].name).join(" · ") || "REPOS"
                  : B.sub;
                return (
                  <button key={k} className={`pj-row acc-${B.acc}`}
                    disabled={!B.vue} onClick={() => B.vue && setView(B.vue)}>
                    <span className="pj-bar" />
                    <span className="pj-txt">
                      <span className="pj-l">{B.lab}</span>
                      <span className="pj-d">{detail}</span>
                    </span>
                    {B.vue && <span className="pj-go">►</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <Rule label="PLANS DE PROGRESSION" right={`0${PLANS.length}`} />
            <div className="grid">
              {PLANS.map((p) => <PlanCard key={p.id} item={p} onOpen={() => setView(p.id)} />)}
            </div>
          </section>

          <footer className="foot">FIL DE DONNÉES LOCAL · AUCUNE SYNCHRO EXTERNE</footer>
        </main>
      )}

      {plan && (
        <main className="scroll">
          {back("dash", "RETOUR SHELL")}
          <Rule label={plan.name} right={plan.code} />
          {view === "physique" && <Physique S={S} set={set} />}
          {view === "sport" && (
            <div className="grid">
              {SPORT_SUB.map((s) => <PlanCard key={s.id} item={s} onOpen={() => setView(s.id)} />)}
            </div>
          )}
          {(view === "esport" || view === "nutrition") && (
            <div className="empty">
              <div className="empty-glyph"><Glyph name={plan.id} /></div>
              <p>Module non déployé.</p>
              <p className="empty-sub">{plan.desc}</p>
            </div>
          )}
        </main>
      )}

      {sub && (
        <main className="scroll">
          {back("sport", "RETOUR SPORT")}
          <Rule label={sub.name} right={sub.code} />
          {view === "convict" && <Convict S={S} onLog={ccLog} onLevel={ccLevel} onRythme={ccRythme} />}
          {view === "gainage" && <Gainage data={S.gainage} onSave={saveGainage} />}
          {view === "perfs" && <Perfs data={S.perfs} onSave={savePerf} />}
          {view === "muscu" && <Salle data={S.muscu} onSave={saveSalle}
            jourSeance={(duJour.find((b) => b.t === "muscu") || {}).s} />}
          {view === "abdos" && <Abdos data={S.abdos} onDone={abdosDone} />}
          {view === "duo" && <Duo data={S.duo} onSave={duoSave} onToggle={duoToggle}
            jourSeance={(duJour.find((b) => b.t === "duo") || {}).s} />}

        </main>
      )}
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
const CSS = `
.hos {
  --void:#080A08; --deep:#0E120E; --panel:#141A14; --line:#232B22;
  --bone:#E6EDE2; --ash:#75826F;
  --lime:#D6F94A; --mint:#31F08C; --flare:#FF2E55; --violet:#B94BFF; --amber:#FF8A1A;
  --proof:#FF35C8;
  position:relative; min-height:100%; background:var(--void); color:var(--bone);
  font-family:"SFMono-Regular",ui-monospace,Menlo,Consolas,monospace;
  font-size:12px; -webkit-font-smoothing:antialiased; overflow:hidden;
}
.hos::before{content:""; position:absolute; inset:0; pointer-events:none; z-index:5; opacity:.35;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.5) 0 1px,transparent 1px 3px)}
.hos *{box-sizing:border-box}
.hos button{font:inherit; color:inherit; background:none; border:none; padding:0; cursor:pointer}
.hos p{margin:0}
.hos button:disabled{opacity:.35}

.topbar{display:flex; align-items:center; justify-content:space-between;
  padding:14px 14px 10px; border-bottom:1px solid var(--line); background:var(--deep)}
.brand{font-size:15px; letter-spacing:.22em; font-weight:700}
.brand-b{padding:4px 2px; margin:-4px -2px; text-align:left}
.brand-b:active{color:var(--live)}
.brand i{color:var(--live); font-style:normal}
.topmeta{display:flex; align-items:center; gap:8px}
.chip{font-size:9px; letter-spacing:.14em; color:var(--ash); border:1px solid var(--line); padding:3px 6px}
.chip-b{min-height:26px; padding:5px 9px}
.chip-b.on{border-color:var(--lime); color:var(--lime)}

.flash{position:absolute; top:56px; left:12px; right:12px; z-index:22; background:var(--lime);
  color:var(--void); font-size:9px; letter-spacing:.1em; line-height:1.5; padding:10px 12px}
.dpanel{position:absolute; top:49px; left:0; right:0; z-index:21; background:var(--deep);
  border-bottom:1px solid var(--line); padding:12px}
.dp-state{font-size:8px; letter-spacing:.14em; color:var(--live)}
.dp-note{font-size:8.5px; line-height:1.6; color:var(--ash); margin:9px 0 12px}
.dp-btn{display:block; position:relative; width:100%; height:46px; margin-bottom:8px;
  border:1px solid var(--line); background:var(--panel); font-size:10px; letter-spacing:.16em;
  line-height:44px; text-align:center; overflow:hidden}
.dp-btn:active{background:#1A211A}
.dp-in input{position:absolute; inset:0; opacity:0; width:100%; height:100%}
.dp-raz{border-color:#3A2429; color:var(--flare)}
.dp-raz.armed{background:var(--flare); color:var(--void); border-color:var(--flare); font-weight:700}
.dp-count{font-size:7.5px; letter-spacing:.12em; color:var(--ash); text-align:center; margin-top:4px}

.cc-ry-week{display:flex; gap:3px; margin-top:8px}
.cc-ry-week i{font-style:normal; width:20px; height:16px; line-height:16px; text-align:center;
  font-size:7.5px; letter-spacing:.04em; background:var(--deep); color:#3A453A; border:1px solid var(--line)}
.cc-ry-week i.on{background:var(--lime); border-color:var(--lime); color:var(--void); font-weight:700}
.cc-ry.on .cc-ry-week i{border-color:#2E3A2C}
.cc-ry.on .cc-ry-week i.on{border-color:var(--lime)}

/* --- seance du jour --- */
.pj{display:flex; flex-direction:column; gap:6px}
.pj-row{position:relative; display:flex; align-items:center; gap:10px; width:100%;
  min-height:58px; padding:9px 11px 9px 14px; text-align:left;
  border:1px solid var(--line); background:var(--panel)}
.pj-row:active{background:#1A211A}
.pj-row:disabled{opacity:.55}
.pj-bar{position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--acc)}
.pj-txt{flex:1; min-width:0}
.pj-l{display:block; font-size:11px; letter-spacing:.16em; color:var(--acc)}
.pj-d{display:block; font-size:8.5px; letter-spacing:.08em; color:var(--ash); margin-top:4px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.pj-go{font-size:11px; color:var(--ash)}
.acc-ash{--acc:var(--ash)}
.duo-flag{border:1px solid var(--violet); color:var(--violet); font-size:8px;
  letter-spacing:.16em; padding:7px 9px; margin-bottom:8px; text-align:center}

/* --- salle --- */
.sl-list{display:flex; flex-direction:column; gap:6px}
.sl-ex{border:1px solid var(--line); background:var(--panel); padding:9px 10px 10px}
.sl-ex-top{display:flex; justify-content:space-between; align-items:baseline; gap:8px}
.sl-ex-n{font-size:9.5px; letter-spacing:.08em; line-height:1.3}
.sl-ex-t{font-size:11px; color:var(--flare); font-variant-numeric:tabular-nums; white-space:nowrap}
.sl-ex-in{display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:9px}
.sl-ex-in .numwrap{height:42px; padding:0 8px}
.sl-ex-in .numin{font-size:16px; text-align:center}
.sl-ex-last{font-size:7.5px; letter-spacing:.1em; color:var(--ash); margin-top:7px}
.sl-go{background:var(--flare); color:var(--bone)}

/* --- abdos --- */
.ab-blocks{grid-template-columns:repeat(6,1fr)}
.ab-ex{border-top:1px solid var(--line)}
.ab-row{display:grid; grid-template-columns:26px 1fr; gap:8px; align-items:center;
  min-height:40px; border-bottom:1px solid var(--line); font-size:9.5px; letter-spacing:.06em}
.ab-i{font-size:9px; color:#3A453A; font-variant-numeric:tabular-nums}
.ab-go{background:var(--mint); color:var(--void)}

/* --- duo --- */
.duo-head{border:1px solid var(--line); background:var(--panel); padding:11px; margin-top:6px}
.duo-head.on{border-color:var(--violet)}
.duo-head-top{display:flex; justify-content:space-between; align-items:center;
  font-size:9px; letter-spacing:.16em; color:var(--ash)}
.duo-sw{min-width:84px; height:34px; border:1px solid var(--line); background:var(--deep);
  font-size:9px; letter-spacing:.14em; color:var(--ash)}
.duo-sw.on{background:var(--violet); border-color:var(--violet); color:var(--void); font-weight:700}
.duo-note{font-size:8.5px; line-height:1.6; color:var(--ash); margin-top:10px}
.duo-go{background:var(--violet); color:var(--void)}

.cc-days{display:grid; grid-template-columns:repeat(7,1fr); gap:3px; margin-bottom:10px}
.cc-day{height:38px; border:1px solid var(--line); background:var(--panel);
  font-size:8px; letter-spacing:.06em; color:#3A453A}
.cc-day.actif{color:var(--ash)}
.cc-day.auj{border-bottom:2px solid var(--ash)}
.cc-day.sel{border-color:var(--lime); color:var(--lime)}
.clock{font-size:11px; letter-spacing:.1em; background:var(--bone); color:var(--void); padding:3px 7px}

.scroll{height:calc(100% - 49px); overflow-y:auto; -webkit-overflow-scrolling:touch; padding:12px 12px 44px}

.rule{display:flex; align-items:center; gap:8px; margin:16px 0 10px}
.rule-label{font-size:10px; letter-spacing:.2em}
.rule-line{flex:1; height:1px; background:var(--line)}
.rule-right{font-size:9px; letter-spacing:.14em; color:var(--live)}

/* --- initialisation --- */
.init{display:flex; flex-direction:column; height:100%; padding:18px 16px 22px}
.init-top{display:flex; justify-content:space-between; align-items:center}
.init-ticks{display:flex; gap:4px}
.init-ticks span{width:16px; height:3px; background:var(--line)}
.init-ticks span.on{background:var(--lime)}
.init-body{flex:1; display:flex; flex-direction:column; justify-content:center}
.init-kicker{font-size:9px; letter-spacing:.2em; color:var(--ash)}
.init-q{font-size:30px; letter-spacing:.06em; margin:10px 0 12px; font-weight:700}
.init-help{font-size:9.5px; line-height:1.7; color:var(--ash); letter-spacing:.05em; margin-bottom:22px; max-width:34ch}
.init-choices{max-width:280px}
.init-foot{display:flex; flex-direction:column; gap:10px}
.init-back{font-size:9px; letter-spacing:.16em; color:var(--ash); align-self:flex-start}
.init-next{height:52px; background:var(--lime); color:var(--void); font-size:12px;
  letter-spacing:.18em; font-weight:700}
.init-note{font-size:8px; letter-spacing:.08em; color:var(--ash); text-align:center}

/* --- dashboard --- */
.hero-grid{display:grid; grid-template-columns:143px 1fr; gap:8px}

.gauges{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px}
.gauge{border:1px solid var(--line); background:var(--panel); padding:8px 9px 7px;
  display:grid; grid-template-columns:1fr auto; row-gap:6px; --gc:var(--lime)}
.gauge.endu{--gc:var(--mint)}
.gauge-l{font-size:8px; letter-spacing:.16em; color:var(--ash); align-self:center}
.gauge-v{font-size:17px; line-height:1; font-variant-numeric:tabular-nums; color:var(--gc)}
.gauge-t{grid-column:1/-1; height:3px; background:var(--line); position:relative}
.gauge-t i{position:absolute; inset:0 auto 0 0; background:var(--gc); transition:width .3s ease}

/* --- convict conditioning --- */
.cc-rythmes{display:flex; flex-direction:column; gap:6px}
.cc-ry{border:1px solid var(--line); background:var(--panel); padding:9px 10px; text-align:left}
.cc-ry-n{display:block; font-size:10px; letter-spacing:.16em; color:var(--bone)}
.cc-ry-s{display:block; font-size:8px; letter-spacing:.08em; color:var(--ash); margin-top:4px}
.cc-ry.on{border-color:var(--lime); background:#171E12}
.cc-ry.on .cc-ry-n{color:var(--lime)}

.cc-today{border:1px solid var(--line); border-left:3px solid var(--lime);
  background:var(--panel); padding:11px; margin-bottom:8px}
.cc-today.done{border-left-color:var(--proof)}
.cc-today-top{display:flex; justify-content:space-between; align-items:baseline}
.cc-today-chain{font-size:11px; letter-spacing:.14em}
.cc-today-lvl{font-size:8px; letter-spacing:.12em; color:var(--ash)}
.cc-today-step{font-size:9px; letter-spacing:.1em; color:var(--ash); margin-top:5px}
.cc-today-goal{display:flex; justify-content:space-between; align-items:baseline;
  border-top:1px solid var(--line); margin-top:9px; padding-top:9px}
.cc-goal-lab{font-size:8px; letter-spacing:.14em; color:var(--ash)}
.cc-today.done .cc-goal-lab{color:var(--proof)}
.cc-goal-val{font-size:19px; font-variant-numeric:tabular-nums; color:var(--lime)}
.cc-today.done .cc-goal-val{color:var(--proof)}
.cc-entry{display:flex; gap:6px; margin-top:10px}
.cc-entry .numwrap{height:44px; padding:0 8px}
.cc-entry .numin{font-size:16px; text-align:center}
.cc-ok{width:56px; flex:none; height:44px; background:var(--lime); color:var(--void);
  font-size:11px; letter-spacing:.1em; font-weight:700}
.cc-up{width:100%; height:46px; margin-top:10px; background:var(--proof); color:var(--void);
  font-size:10px; letter-spacing:.14em; font-weight:700}

.cc-chain{border:1px solid var(--line); background:var(--panel); margin-bottom:6px}
.cc-chain.open{border-color:#2E3A2C}
.cc-chain-head{display:grid; grid-template-columns:44px 1fr auto; gap:10px; align-items:center;
  width:100%; padding:9px 10px; text-align:left}
.cc-chain-pose{height:34px; color:var(--live)}
.cc-chain-n{display:block; font-size:10px; letter-spacing:.14em}
.cc-chain-s{display:block; font-size:8px; color:var(--ash); margin-top:3px}
.cc-chain-lvl{font-size:20px; font-variant-numeric:tabular-nums; color:var(--lime)}
.cc-chain-bar{display:block; height:2px; background:var(--line); position:relative}
.cc-chain-bar i{position:absolute; inset:0 auto 0 0; background:var(--lime)}

.cc-steps{border-top:1px solid var(--line)}
.cc-step{display:grid; grid-template-columns:1fr 44px; border-bottom:1px solid var(--line)}
.cc-step-main{display:grid; grid-template-columns:24px 1fr auto; gap:8px; align-items:center;
  min-height:42px; padding:4px 0 4px 10px; text-align:left}
.cc-step-i{font-size:9px; color:#3A453A; font-variant-numeric:tabular-nums}
.cc-step-n{font-size:9px; letter-spacing:.08em; color:var(--ash)}
.cc-step-std{font-size:9px; color:#3A453A; font-variant-numeric:tabular-nums; padding-right:6px}
.cc-step.done .cc-step-i,.cc-step.done .cc-step-n{color:var(--mint)}
.cc-step.cur{background:var(--deep)}
.cc-step.cur .cc-step-n{color:var(--lime)}
.cc-step.cur .cc-step-i,.cc-step.cur .cc-step-std{color:var(--lime)}
.cc-step-info{border-left:1px solid var(--line); font-size:12px; color:var(--ash)}

.cc-modal{position:fixed; inset:0; z-index:20; background:rgba(4,6,4,.86);
  display:flex; align-items:flex-end; justify-content:center; padding:14px}
.cc-sheet{width:100%; max-width:380px; border:1px solid var(--line); background:var(--deep);
  padding:14px; max-height:88%; overflow-y:auto}
.cc-sheet-top{display:flex; justify-content:space-between; align-items:center;
  font-size:8.5px; letter-spacing:.14em; color:var(--ash)}
.cc-sheet-top button{color:var(--flare); font-size:8.5px; letter-spacing:.14em}
.cc-sheet-pose{height:110px; margin:14px 0; color:var(--lime)}
.cc-sheet-n{font-size:15px; letter-spacing:.08em}
.cc-sheet-d{font-size:10px; line-height:1.7; color:var(--ash); margin-top:8px}
.cc-sheet-std{margin-top:14px; border-top:1px solid var(--line)}
.cc-sheet-row{display:flex; justify-content:space-between; align-items:center;
  border-bottom:1px solid var(--line); padding:9px 0; font-size:9px; letter-spacing:.12em; color:var(--ash)}
.cc-sheet-row b{font-size:13px; color:var(--bone); font-variant-numeric:tabular-nums; font-weight:400}
.cc-sheet-link{display:block; margin-top:14px; height:46px; line-height:46px; text-align:center;
  border:1px solid var(--lime); color:var(--lime); font-size:9px; letter-spacing:.14em; text-decoration:none}
.rail{display:flex; flex-direction:column; gap:9px}
.stat{display:grid; grid-template-columns:1fr auto; row-gap:4px; text-align:left; padding:2px 0}
.stat-name{font-size:9px; letter-spacing:.09em; color:var(--ash)}
.stat-val{font-size:12px; font-variant-numeric:tabular-nums}
.stat-void .stat-val{color:var(--ash)}
.stat-unit{font-style:normal; font-size:8px; color:var(--ash); margin-left:2px}
.stat-track{grid-column:1/-1; height:2px; background:var(--line); position:relative}
.stat-track i{position:absolute; inset:0 auto 0 0; background:var(--ash); transition:width .25s ease}
.stat-on .stat-name{color:var(--live)}
.stat-on .stat-track i{background:var(--live); box-shadow:0 0 6px var(--live)}
.stat-on .stat-track::after{content:""; position:absolute; right:-1px; top:-2px; width:2px; height:6px; background:var(--flare)}

.body{position:relative; display:flex; flex-direction:column; align-items:center; min-height:352px}
.shell-svg{flex:1; max-height:300px}
.readout{align-self:flex-start; font-size:7.5px; line-height:1.65; letter-spacing:.08em; color:var(--ash); padding-left:4px}
.readout .ok{color:var(--live)}
.filament{stroke-dasharray:9 190; animation:flow linear infinite}
@keyframes flow{from{stroke-dashoffset:200}to{stroke-dashoffset:0}}
.scanline{animation:scan 6s cubic-bezier(.4,0,.6,1) infinite}
@keyframes scan{0%,100%{transform:translateY(20px);opacity:0}50%{transform:translateY(400px);opacity:.55}}
@media (prefers-reduced-motion:reduce){.filament,.scanline{animation:none}}

/* --- éditeurs --- */
.editor{margin-top:10px; border:1px solid var(--line); background:var(--panel); padding:10px}
.editor-head{display:flex; justify-content:space-between; font-size:9px; letter-spacing:.14em; margin-bottom:10px}
.editor-drives{color:var(--live)}
.editor-note{font-size:8px; line-height:1.5; color:var(--ash); margin-top:9px; letter-spacing:.04em}
.editor-ctrl{display:flex; align-items:center; gap:8px}
.editor-ctrl button{width:44px; height:44px; flex:none; border:1px solid var(--line);
  background:var(--deep); font-size:18px; line-height:1}
.editor-ctrl button:active{background:var(--live); color:var(--void)}
.numwrap{flex:1; display:flex; align-items:baseline; gap:5px; border:1px solid var(--line);
  background:var(--deep); height:44px; padding:0 10px}
.numin{flex:1; width:100%; background:none; border:none; outline:none; color:var(--bone);
  font:inherit; font-size:19px; font-variant-numeric:tabular-nums; -moz-appearance:textfield}
.numin::-webkit-outer-spin-button,.numin::-webkit-inner-spin-button{-webkit-appearance:none; margin:0}
.numin::placeholder{color:#3A453A}
.numunit{font-size:8px; letter-spacing:.12em; color:var(--ash)}
.slide{width:100%; margin-top:12px; -webkit-appearance:none; height:26px; background:none}
.slide::-webkit-slider-runnable-track{height:2px; background:var(--line)}
.slide::-webkit-slider-thumb{-webkit-appearance:none; width:14px; height:20px;
  background:var(--live); margin-top:-9px; border-radius:0}
.choices{display:grid; grid-template-columns:1fr 1fr; gap:8px}
.choice{height:46px; border:1px solid var(--line); background:var(--deep);
  font-size:10px; letter-spacing:.16em; color:var(--ash)}
.choice-on{background:var(--lime); border-color:var(--lime); color:var(--void); font-weight:700}

/* --- cards --- */
.grid{display:grid; grid-template-columns:1fr 1fr; gap:8px}
.card{position:relative; aspect-ratio:1/1; display:flex; flex-direction:column; text-align:left;
  background:var(--panel); border:1px solid var(--line); padding:11px 10px 9px; overflow:hidden}
.card:active{background:#1A211A}
.card-bar{position:absolute; inset:0 0 auto 0; height:3px; background:var(--acc)}
.card-top{display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:auto}
.card-glyph{width:30px; height:30px; color:var(--acc)}
.card-code{font-size:8px; letter-spacing:.12em; color:var(--ash)}
.card-name{font-size:11px; letter-spacing:.08em; line-height:1.25; margin-bottom:4px}
.card-desc{font-size:8px; line-height:1.4; color:var(--ash); margin-bottom:7px}
.card-state{font-size:7.5px; letter-spacing:.16em; color:var(--acc);
  border-top:1px solid var(--line); padding-top:5px; width:100%}
.acc-mint{--acc:var(--mint)} .acc-lime{--acc:var(--lime)}
.acc-violet{--acc:var(--violet)} .acc-amber{--acc:var(--amber)} .acc-flare{--acc:var(--flare)}

/* --- module physique --- */
.phys-head{display:grid; grid-template-columns:92px 1fr; gap:12px; align-items:center;
  border:1px solid var(--line); background:var(--panel); padding:12px; margin-top:6px}
.phys-preview{height:152px}
.ps-big{font-size:36px; line-height:1; font-variant-numeric:tabular-nums}
.ps-lab{font-size:8px; letter-spacing:.14em; color:var(--ash); margin-top:5px}
.ps-tag{display:inline-block; font-size:8.5px; letter-spacing:.16em; padding:3px 6px; margin-top:8px;
  border:1px solid currentColor}
.ps-line{font-size:8px; letter-spacing:.1em; color:var(--ash); margin-top:8px}

.frows{border-top:1px solid var(--line)}
.frow{border-bottom:1px solid var(--line)}
.frow-head{display:flex; justify-content:space-between; align-items:center; width:100%;
  min-height:44px; text-align:left; padding:4px 2px}
.frow-label{font-size:9.5px; letter-spacing:.1em; color:var(--ash)}
.frow-val{font-size:13px; font-variant-numeric:tabular-nums}
.frow-val.void{color:#3A453A}
.frow-val i{font-style:normal; font-size:8px; color:var(--ash); margin-left:3px}
.frow-on{background:var(--deep)}
.frow-on .frow-label{color:var(--live)}
.frow-on .editor{margin:0 6px 10px}

.tiles{display:grid; grid-template-columns:1fr 1fr; gap:8px}
.tile{display:flex; flex-direction:column; justify-content:space-between; min-height:84px;
  border:1px solid var(--line); background:var(--panel); padding:9px 9px 8px; border-left-width:3px}
.tile-wide{grid-column:1/-1; min-height:66px}
.tile-label{font-size:8px; letter-spacing:.13em; color:var(--ash)}
.tile-value{font-size:22px; line-height:1.15; font-variant-numeric:tabular-nums; margin:5px 0 3px}
.tile-value i{font-style:normal; font-size:9px; color:var(--ash); margin-left:3px}
.tile-note{font-size:7.5px; letter-spacing:.12em; color:var(--ash)}
.st-ok{border-left-color:var(--mint)} .st-ok .tile-note{color:var(--mint)}
.st-mid{border-left-color:var(--amber)} .st-mid .tile-note{color:var(--amber)}
.st-warn{border-left-color:var(--flare)} .st-warn .tile-note{color:var(--flare)}
.st-off{border-left-color:var(--line)} .st-off .tile-value{color:#3A453A}
.ps-tag.st-ok{color:var(--mint)} .ps-tag.st-mid{color:var(--amber)}
.ps-tag.st-warn{color:var(--flare)} .ps-tag.st-off{color:var(--ash)}
.disclaimer{font-size:7.5px; line-height:1.6; letter-spacing:.06em; color:var(--ash); margin-top:12px}

/* --- gainage --- */
.gg-head{border:1px solid var(--line); background:var(--panel); padding:12px; margin-top:6px}
.gg-head.proof{border-color:var(--proof)}
.gg-palier{display:flex; align-items:baseline; gap:7px; flex-wrap:wrap}
.gg-plabel{font-size:9px; letter-spacing:.18em; color:var(--ash)}
.gg-pnum{font-size:34px; line-height:1; color:var(--mint); font-variant-numeric:tabular-nums}
.gg-head.proof .gg-pnum{color:var(--proof)}
.gg-ptot{font-size:11px; color:var(--ash)}
.gg-proof{margin-left:auto; font-size:8.5px; letter-spacing:.2em; background:var(--proof);
  color:var(--void); padding:3px 7px; font-weight:700}

.gg-blocks{display:grid; grid-template-columns:repeat(5,1fr); gap:4px; margin:14px 0 10px}
.gg-block{height:44px; background:var(--deep); border:1px solid var(--line);
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px}
.gg-block b{font-size:14px; font-weight:400; color:#4A554A; font-variant-numeric:tabular-nums}
.gg-block i{font-style:normal; font-size:7px; letter-spacing:.1em; color:#3A453A}
.gg-block.on{background:var(--mint); border-color:var(--mint)}
.gg-block.on b{color:var(--void); font-weight:700}
.gg-block.on i{color:rgba(8,10,8,.6)}
.gg-block.next{border-color:var(--lime)}
.gg-block.next b{color:var(--lime)}
.gg-block.next i{color:var(--lime)}
.gg-block.hit{border-color:var(--lime); box-shadow:inset 0 0 0 1px var(--lime)}
.gg-block.hit b{color:var(--lime)}
.gg-head.proof .gg-block.on{background:var(--proof); border-color:var(--proof)}
.gg-next{font-size:8.5px; letter-spacing:.12em; color:var(--ash)}
.gg-head.proof .gg-next{color:var(--proof)}

.gg-vars{display:grid; grid-template-columns:1fr 1fr; gap:6px}
.gg-var{min-height:52px; border:1px solid var(--line); background:var(--panel);
  padding:8px 8px 7px; text-align:left; display:flex; flex-direction:column; justify-content:space-between; gap:5px}
.gg-var-n{font-size:9.5px; letter-spacing:.12em; color:var(--bone); display:flex; align-items:baseline; gap:5px}
.gg-var-n em{font-style:normal; font-size:6.5px; letter-spacing:.14em; color:var(--amber);
  border:1px solid var(--amber); padding:1px 3px}
.gg-var-r{font-size:7.5px; letter-spacing:.08em; color:var(--ash); line-height:1.4}
.gg-var.on{border-color:var(--mint)}
.gg-var.on .gg-var-n{color:var(--mint)}
.gg-var.lock{opacity:.45}
.gg-var.lock .gg-var-n{color:var(--ash)}
.gg-var.proof{border-color:var(--proof)}
.gg-var.proof .gg-var-n{color:var(--proof)}
.gg-var.proof .gg-var-n em{color:var(--proof); border-color:var(--proof)}

.gg-timer{margin-top:16px; border:1px solid var(--line); background:var(--panel); padding:16px 12px 12px; text-align:center}
.gg-time{font-size:52px; line-height:1; letter-spacing:.02em; font-variant-numeric:tabular-nums; color:#3A453A}
.gg-time.live{color:var(--mint); text-shadow:0 0 18px rgba(49,240,140,.35)}
.gg-time.proof{color:var(--proof); text-shadow:0 0 22px rgba(255,53,200,.45)}
.gg-bar{height:3px; background:var(--line); margin:14px 0 6px; position:relative}
.gg-bar i{position:absolute; inset:0 auto 0 0; background:var(--mint)}
.gg-bar.proof i{background:var(--proof)}
.gg-target{font-size:8px; letter-spacing:.16em; color:var(--ash)}
.pf-rec{font-size:52px; line-height:1; font-variant-numeric:tabular-nums; color:var(--mint)}
.pf-rec.proof{color:var(--proof); text-shadow:0 0 22px rgba(255,53,200,.45)}
.pf-rec i{font-style:normal; font-size:8px; letter-spacing:.16em; color:var(--ash); margin-left:8px}
.pf-entry{display:flex; align-items:center; gap:8px; margin-top:16px}
.pf-entry button{width:48px; height:46px; flex:none; border:1px solid var(--line);
  background:var(--deep); font-size:19px; line-height:1}
.pf-entry button:active{background:var(--mint); color:var(--void)}
.pf-entry .numwrap{height:46px}
.pf-entry .numin{text-align:center; font-size:21px}
.gg-go{width:100%; height:52px; margin-top:14px; background:var(--mint); color:var(--void);
  font-size:11px; letter-spacing:.16em; font-weight:700}
.gg-stop{background:var(--flare); color:var(--bone)}

.lrow{display:grid; grid-template-columns:auto 1fr auto; gap:10px; align-items:center;
  border-bottom:1px solid var(--line); min-height:38px; font-size:9.5px}
.lrow-d{color:var(--ash); font-variant-numeric:tabular-nums}
.lrow-v{font-size:8px; letter-spacing:.12em; color:var(--ash)}
.lrow-s{font-size:13px; font-variant-numeric:tabular-nums}
.lrow-s.rec{color:var(--mint)}
.lrow-s.proof{color:var(--proof)}

/* --- muscu --- */
.mu-new{border:1px solid var(--line); background:var(--panel); padding:11px; margin-top:6px}
.mu-area{width:100%; background:var(--deep); border:1px solid var(--line); color:var(--bone);
  font:inherit; font-size:12px; line-height:1.6; padding:10px; outline:none; resize:vertical}
.mu-area::placeholder{color:#3A453A}
.mu-new .gg-go{background:var(--flare); color:var(--bone)}
.mu-card{border:1px solid var(--line); background:var(--panel); padding:10px; margin-bottom:8px}
.mu-card-head{display:flex; justify-content:space-between; align-items:center;
  font-size:9px; letter-spacing:.14em; color:var(--ash); margin-bottom:8px}
.mu-del{font-size:8px; letter-spacing:.14em; color:var(--flare)}
.mu-txt{margin:0; font:inherit; font-size:11px; line-height:1.65; white-space:pre-wrap}

.back{font-size:9px; letter-spacing:.16em; color:var(--ash); padding:8px 0 2px}
.empty{border:1px solid var(--line); background:var(--panel); padding:34px 18px; text-align:center; margin-top:4px}
.empty-glyph{width:38px; height:38px; margin:0 auto 16px; color:var(--ash)}
.empty p{font-size:11px; letter-spacing:.1em}
.empty-sub{margin-top:8px; font-size:8.5px; color:var(--ash); line-height:1.6}
.foot{margin-top:22px; font-size:7.5px; letter-spacing:.16em; color:var(--ash); text-align:center}
`;


ReactDOM.createRoot(document.getElementById("root")).render(<HealthOS />);
