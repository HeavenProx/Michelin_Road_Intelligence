/**
 * services/profiler.js — Calcul du profil cycliste
 *
 * Prend les activités Strava (enrichies avec météo) et produit un profil
 * structuré qui sera utilisé par le moteur de recommandation.
 *
 * Profil retourné :
 *  - dominant_terrain   : "mountain" | "hilly" | "flat"
 *  - monthly_distance   : km/mois en moyenne
 *  - ride_style         : "endurance" | "tempo" | "racing"
 *  - weather_exposure   : % de sorties sous la pluie + % par vent fort
 *  - region             : ville/pays déduit des coordonnées GPS
 *  - ride_count         : nombre de sorties analysées
 */

const { enrichRidesWithWeather } = require('./weather');

/**
 * Convertit des mètres en kilomètres avec 1 décimale.
 */
const toKm = (meters) => Math.round(meters / 100) / 10;

/**
 * Calcule le terrain dominant à partir du ratio dénivelé / distance.
 * Seuils basés sur les conventions cyclisme :
 *  > 15m/km → montagne
 *  8-15m/km → vallonné
 *  < 8m/km  → plat
 */
function calcDominantTerrain(rides) {
  if (rides.length === 0) return 'flat';

  const totalDistance    = rides.reduce((s, r) => s + (r.distance || 0), 0);
  const totalElevation   = rides.reduce((s, r) => s + (r.total_elevation_gain || 0), 0);
  const totalDistanceKm  = totalDistance / 1000;

  if (totalDistanceKm === 0) return 'flat';

  const ratioMperKm = totalElevation / totalDistanceKm;

  if (ratioMperKm > 15) return 'mountain';
  if (ratioMperKm >= 8) return 'hilly';
  return 'flat';
}

/**
 * Calcule la distance mensuelle moyenne en km.
 * On regarde sur combien de mois distincts les rides sont répartis.
 */
function calcMonthlyDistance(rides) {
  if (rides.length === 0) return 0;

  const totalKm = toKm(rides.reduce((s, r) => s + (r.distance || 0), 0));

  // Nombre de mois distincts couverts par les activités
  const months = new Set(
    rides.map(r => r.start_date.substring(0, 7)) // "YYYY-MM"
  );
  const monthCount = Math.max(months.size, 1);

  return Math.round(totalKm / monthCount);
}

/**
 * Détermine le style de conduite à partir de la vitesse moyenne.
 * Vitesse en m/s dans Strava → conversion en km/h.
 */
function calcRideStyle(rides) {
  if (rides.length === 0) return 'endurance';

  // Filtre les rides avec une vitesse valide (>0 pour éviter les erreurs GPS)
  const ridesWithSpeed = rides.filter(r => r.average_speed > 0);
  if (ridesWithSpeed.length === 0) return 'endurance';

  const avgSpeedMs = ridesWithSpeed.reduce((s, r) => s + r.average_speed, 0) / ridesWithSpeed.length;
  const avgSpeedKmh = avgSpeedMs * 3.6;

  if (avgSpeedKmh > 32) return 'racing';
  if (avgSpeedKmh >= 25) return 'tempo';
  return 'endurance';
}

/**
 * Calcule l'exposition météo : % de sorties sous la pluie et par vent fort.
 * Seuil pluie : précipitation > 1mm sur l'heure de départ
 * Seuil vent  : vitesse > 30 km/h
 */
function calcWeatherExposure(ridesWithWeather) {
  if (ridesWithWeather.length === 0) {
    return { rain_percentage: 0, wind_percentage: 0, rainy_rides: 0 };
  }

  const rainyRides = ridesWithWeather.filter(r => (r.weather?.precipitation_mm ?? 0) > 1);
  const windyRides = ridesWithWeather.filter(r => (r.weather?.wind_speed_kmh ?? 0) > 30);

  return {
    rain_percentage: Math.round((rainyRides.length / ridesWithWeather.length) * 100),
    wind_percentage: Math.round((windyRides.length / ridesWithWeather.length) * 100),
    rainy_rides: rainyRides.length,
  };
}

/**
 * Déduit une région approximative depuis les coordonnées GPS moyennes.
 * Utilise un reverse geocoding très simplifié basé sur les bounding boxes
 * des grandes régions françaises — assez pour la recommandation pneu.
 *
 * Pour un usage réel, on remplacerait ça par un appel Nominatim (OpenStreetMap).
 */
function calcRegion(rides) {
  const ridesWithGPS = rides.filter(r => r.start_latlng?.length === 2);

  if (ridesWithGPS.length === 0) return 'Inconnue';

  const avgLat = ridesWithGPS.reduce((s, r) => s + r.start_latlng[0], 0) / ridesWithGPS.length;
  const avgLon = ridesWithGPS.reduce((s, r) => s + r.start_latlng[1], 0) / ridesWithGPS.length;

  // Grandes régions françaises (approximatif)
  if (avgLat > 47.5 && avgLon > 5.5)   return 'Alpes / Est';
  if (avgLat > 44.5 && avgLon > 2.5)   return 'Massif Central / Auvergne';
  if (avgLat < 44 && avgLon > 0)        return 'Pyrénées / Sud-Ouest';
  if (avgLat > 47 && avgLon < 2)        return 'Normandie / Bretagne';
  if (avgLat > 48.5)                    return 'Île-de-France / Nord';
  if (avgLat < 43.5 && avgLon > 4)     return 'Provence / Côte d\'Azur';
  return 'France';
}

/**
 * Calcule le dénivelé moyen par sortie (utile pour l'explication de la reco).
 */
function calcAvgElevation(rides) {
  if (rides.length === 0) return 0;
  const total = rides.reduce((s, r) => s + (r.total_elevation_gain || 0), 0);
  return Math.round(total / rides.length);
}

/**
 * Fonction principale : calcule le profil complet d'un cycliste.
 * Appelle Open-Meteo pour enrichir les rides avec les données météo.
 *
 * @param {Array} rides - Activités Strava brutes (type Ride)
 * @returns {object} Profil cycliste complet
 */
async function buildProfile(rides) {
  if (!rides || rides.length === 0) {
    throw Object.assign(
      new Error('Aucune activité vélo trouvée sur les 6 derniers mois. Faites quelques sorties et revenez !'),
      { status: 404 }
    );
  }

  console.log(`[PROFILER] Construction du profil pour ${rides.length} rides...`);

  // Enrichissement météo (appels Open-Meteo en parallèle)
  const ridesWithWeather = await enrichRidesWithWeather(rides);

  // Calcul de chaque dimension du profil
  const terrain        = calcDominantTerrain(rides);
  const monthlyDist    = calcMonthlyDistance(rides);
  const style          = calcRideStyle(rides);
  const weather        = calcWeatherExposure(ridesWithWeather);
  const region         = calcRegion(rides);
  const avgElevation   = calcAvgElevation(rides);
  const totalDistanceKm = toKm(rides.reduce((s, r) => s + (r.distance || 0), 0));
  const avgSpeedKmh    = Math.round(
    rides.filter(r => r.average_speed > 0)
         .reduce((s, r) => s + r.average_speed * 3.6, 0)
    / Math.max(rides.filter(r => r.average_speed > 0).length, 1)
  );

  const profile = {
    ride_count:       rides.length,
    total_distance_km: totalDistanceKm,
    monthly_distance: monthlyDist,
    avg_speed_kmh:    avgSpeedKmh,
    avg_elevation_m:  avgElevation,
    dominant_terrain: terrain,
    ride_style:       style,
    weather_exposure: weather,
    region,
    // Labels lisibles pour l'affichage frontend
    terrain_label:   { mountain: 'Montagne', hilly: 'Vallonné', flat: 'Plat' }[terrain],
    style_label:     { endurance: 'Endurance', tempo: 'Tempo', racing: 'Racing' }[style],
  };

  console.log('[PROFILER] ✓ Profil calculé :', JSON.stringify(profile, null, 2));
  return profile;
}

module.exports = { buildProfile };
