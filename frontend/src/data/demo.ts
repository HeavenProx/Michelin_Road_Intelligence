export const RIDER = {
  name: "Alex Dubois",
  location: "Lyon, Isère",
  monthlyKm: 312,
  monthlyElevation: 8400,
  totalKm: 8420,
  rides: 127,
  avgSpeed: 28.4,
  style: "Endurant",
  terrain: [
    { name: "Montagne", value: 52, color: "#27509B" },
    { name: "Plat",     value: 28, color: "#6182BB" },
    { name: "Mixte",    value: 20, color: "#C1D6EF" },
  ],
  weather: { dry: 62, wet: 31, cold: 7 },
  region: "Auvergne-Rhône-Alpes",
};

export const RECO = {
  model: "Power All Season TLR",
  shortDescription: "Grip exceptionnel par temps humide, technologie Protek 360°. Votre allié 4 saisons en montagne.",
  features: ["Protek 360° anti-crevaison", "Compound X-Ice (humide)", "Sans chambre TLR"],
};

export const STORES = [
  // Lyon
  { name: "CycloPro Lyon Centre",     address: "12 Rue de la République, Lyon 2e",    distance: "1 km",    type: "physical" as const, coords: { lat: 45.7578, lng: 4.8320 } },
  { name: "Probikeshop Lyon",         address: "141 Cours Gambetta, Lyon 3e",          distance: "3 km",    type: "physical" as const, coords: { lat: 45.7463, lng: 4.8562 } },
  { name: "Decathlon Lyon Part-Dieu", address: "85 Bd Vivier Merle, Lyon 3e",          distance: "4 km",    type: "physical" as const, coords: { lat: 45.7589, lng: 4.8577 } },
  // Grenoble
  { name: "Le Cyclo — Grenoble",      address: "15 Rue Sébastien Faure, Grenoble",    distance: "106 km",  type: "physical" as const, coords: { lat: 45.1882, lng: 5.7359 } },
  { name: "Probikeshop Grenoble",     address: "40 Av. du Vercors, Grenoble",          distance: "108 km",  type: "physical" as const, coords: { lat: 45.1540, lng: 5.6880 } },
  { name: "Decathlon Pont-de-Claix",  address: "ZAC Champbertier, Pont-de-Claix",     distance: "112 km",  type: "physical" as const, coords: { lat: 45.1278, lng: 5.7010 } },
  // Annecy
  { name: "Intersport Annecy",        address: "12 Rue Jean Jaurès, Annecy",           distance: "138 km",  type: "physical" as const, coords: { lat: 45.8999, lng: 6.1292 } },
  { name: "Decathlon Annecy-le-Vieux", address: "ZAC des Éparses, Annecy-le-Vieux",  distance: "142 km",  type: "physical" as const, coords: { lat: 45.9164, lng: 6.1484 } },
  // Chambéry
  { name: "Decathlon Chambéry",       address: "Bd de la Croix-Rouge, Chambéry",       distance: "98 km",   type: "physical" as const, coords: { lat: 45.5731, lng: 5.9159 } },
  // Valence
  { name: "Decathlon Valence",        address: "ZAC de Font Pré, Valence",              distance: "101 km",  type: "physical" as const, coords: { lat: 44.9284, lng: 4.8887 } },
  // En ligne — France (priorité)
  { name: "Probikeshop",       address: "France",        distance: "En ligne", type: "online" as const, url: "https://www.probikeshop.fr"        },
  { name: "Alltricks",         address: "France",        distance: "En ligne", type: "online" as const, url: "https://www.alltricks.fr"           },
  { name: "Matériel-Vélo",     address: "France",        distance: "En ligne", type: "online" as const, url: "https://www.materiel-velo.com"      },
  // En ligne — Europe
  { name: "Van Eyck Sports",   address: "Belgique",      distance: "En ligne", type: "online" as const, url: "https://www.vaneycksports.be"       },
  { name: "FuturumShop",       address: "Pays-Bas",      distance: "En ligne", type: "online" as const, url: "https://www.futurumshop.nl"         },
  { name: "Bikeinn",           address: "Espagne",       distance: "En ligne", type: "online" as const, url: "https://www.bikeinn.com"            },
  { name: "Deporvillage",      address: "Espagne",       distance: "En ligne", type: "online" as const, url: "https://www.deporvillage.com"       },
  { name: "Lord Gun Bicycles", address: "Italie",        distance: "En ligne", type: "online" as const, url: "https://www.lordgunbicycles.com"    },
  { name: "Bike24",            address: "Allemagne",     distance: "En ligne", type: "online" as const, url: "https://www.bike24.com"             },
  { name: "Bike-Components",   address: "Allemagne",     distance: "En ligne", type: "online" as const, url: "https://www.bike-components.de"     },
  { name: "Amazon.de",         address: "Allemagne",     distance: "En ligne", type: "online" as const, url: "https://www.amazon.de"              },
  { name: "Evans Cycles",      address: "Royaume-Uni",   distance: "En ligne", type: "online" as const, url: "https://www.evanscycles.com"        },
  { name: "Tredz",             address: "Royaume-Uni",   distance: "En ligne", type: "online" as const, url: "https://www.tredz.co.uk"            },
  { name: "BikeTart",          address: "Royaume-Uni",   distance: "En ligne", type: "online" as const, url: "https://www.biketart.com"           },
  { name: "Centrum Rowerowe",  address: "Pologne",       distance: "En ligne", type: "online" as const, url: "https://www.centrumrowerowe.pl"     },
];

export const TIRE_MODELS = [
  { name: "Power All Season TLR",  category: "Route",              km_max: 3500 },
  { name: "Power Road",            category: "Route",              km_max: 4500 },
  { name: "Power Endurance",       category: "Route",              km_max: 7000 },
  { name: "Power Competition TLR", category: "Route Compétition",  km_max: 2800 },
  { name: "Power Gravel",          category: "Gravel",             km_max: 3000 },
  { name: "Wild Enduro",           category: "VTT",                km_max: 2500 },
];

export const REVIEWS = [
  { id: 1, name: "Élodie M.",       location: "Annecy, Haute-Savoie",   tire: "Power All Season TLR", km: 2840, totalKm:  8420, rating: 5, text: "Grip incroyable même sous la pluie en descente du Galibier. Je ne m'attendais pas à autant de confiance sur le mouillé.", date: "12 avril 2026",    criteria: { grip: 5, durabilite: 4, confort: 5, anticrv: 5 } },
  { id: 2, name: "Marc-Antoine D.", location: "Lyon, Rhône",             tire: "Power All Season TLR", km: 4100, totalKm: 12300, rating: 4, text: "4 000 km et la bande de roulement est encore très correcte. Un peu cher mais ça vaut le coup sur la durée.",              date: "28 mars 2026",    criteria: { grip: 4, durabilite: 5, confort: 4, anticrv: 4 } },
  { id: 3, name: "Lucie B.",        location: "Chambéry, Savoie",        tire: "Power All Season TLR", km: 1920, totalKm:  5760, rating: 5, text: "Je roulais avec une autre marque avant. La différence se sent immédiatement dans les virages mouillés.",                  date: "2 mai 2026",      criteria: { grip: 5, durabilite: 4, confort: 5, anticrv: 5 } },
  { id: 4, name: "Thomas G.",       location: "Lyon, Rhône",             tire: "Power All Season TLR", km: 3800, totalKm:  9500, rating: 5, text: "Mon pneu de référence depuis 2 saisons. Polyvalence remarquable, rien à redire.",                                          date: "5 mai 2026",      criteria: { grip: 5, durabilite: 5, confort: 5, anticrv: 5 } },
  { id: 5, name: "Kevin T.",        location: "Nice, Alpes-Maritimes",   tire: "Power Road",           km: 3200, totalKm:  7680, rating: 5, text: "La résistance au roulement est vraiment faible, on gagne facilement 1–2 km/h sur le plat. Excellent en conditions sèches.", date: "18 avril 2026",   criteria: { grip: 5, durabilite: 4, confort: 4, anticrv: 4 } },
  { id: 6, name: "Sébastien R.",    location: "Bordeaux, Gironde",       tire: "Power Road",           km: 2600, totalKm:  6200, rating: 4, text: "Pneu très performant en conditions sèches. Un peu moins à l'aise sous la pluie mais reste très utilisable.",                date: "14 février 2026", criteria: { grip: 4, durabilite: 4, confort: 4, anticrv: 3 } },
  { id: 7, name: "Aurélie F.",      location: "Grenoble, Isère",         tire: "Pro4 Endurance",       km: 5200, totalKm: 11800, rating: 5, text: "Impressionnant en termes de durabilité. Encore utilisable après 5 000 km, c'est incroyable.",                               date: "3 mars 2026",     criteria: { grip: 4, durabilite: 5, confort: 5, anticrv: 5 } },
];

export const PEERS = [
  { name: "Élodie M.",      location: "Annecy, Haute-Savoie", km: 2840, totalKm:  8420, rating: 5, review: "Grip incroyable même sous la pluie en descente du Galibier. Je ne m'attendais pas à autant de confiance sur le mouillé.", similarity: 94, tire: "Power All Season TLR", rides: 52, terrain: "Montagne 58%", date: "12 avril 2026" },
  { name: "Marc-Antoine D.", location: "Lyon, Rhône",          km: 4100, totalKm: 12300, rating: 4, review: "4 000 km et la bande de roulement est encore très correcte. Un peu cher mais ça vaut le coup sur la durée.",              similarity: 89, tire: "Power All Season TLR", rides: 44, terrain: "Montagne 49%", date: "28 mars 2026" },
  { name: "Lucie B.",        location: "Chambéry, Savoie",     km: 1920, totalKm:  5760, rating: 5, review: "Je roulais avec une autre marque avant. La différence se sent immédiatement dans les virages mouillés.",                  similarity: 82, tire: "Power All Season TLR", rides: 61, terrain: "Montagne 45%", date: "2 mai 2026" },
];

export const ALERTS = [
  { tire: "Power All Season TLR", wear: 89, date: "15 juin 2026" },
  { tire: "Pro4 Endurance",       wear: 85, date: "10 mars 2026" },
  { tire: "Lithion 3",            wear: 92, date: "22 octobre 2025" },
];

export const REVIEW_REMINDERS = [
  { tire: "Power All Season TLR", threshold: 2000, date: "10 juin 2026",     done: false },
  { tire: "Power All Season TLR", threshold: 1000, date: "3 février 2026",   done: true  },
  { tire: "Power All Season TLR", threshold: 500,  date: "12 novembre 2025", done: true  },
];
