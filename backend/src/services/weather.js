/**
 * services/weather.js — Wrapper pour l'API Open-Meteo (météo historique)
 *
 * Open-Meteo est 100% gratuit, sans clé API, et fournit des données météo
 * historiques horaires par coordonnées GPS.
 * Doc : https://open-meteo.com/en/docs/historical-weather-api
 *
 * On l'utilise pour déterminer si chaque sortie vélo s'est faite sous la pluie.
 */

const axios = require('axios');

const OPEN_METEO_BASE = 'https://archive-api.open-meteo.com/v1/archive';

/**
 * Récupère les conditions météo historiques pour une activité donnée.
 * On cherche la précipitation et la vitesse du vent à l'heure de départ de l'activité.
 *
 * @param {number} lat       - Latitude du point de départ (ex: 48.8566)
 * @param {number} lon       - Longitude du point de départ (ex: 2.3522)
 * @param {string} dateStr   - Date ISO de l'activité (ex: "2024-03-15")
 * @param {number} hour      - Heure de départ (0-23)
 * @returns {{ precipitation_mm: number, wind_speed_kmh: number }}
 */
async function getWeatherForRide(lat, lon, dateStr, hour) {
  try {
    const response = await axios.get(OPEN_METEO_BASE, {
      params: {
        latitude:  lat,
        longitude: lon,
        start_date: dateStr,
        end_date:   dateStr,
        // Variables horaires qui nous intéressent :
        // - precipitation : pluie en mm sur l'heure
        // - wind_speed_10m : vitesse du vent à 10m de hauteur
        hourly: 'precipitation,wind_speed_10m',
        timezone: 'Europe/Paris',
      },
      timeout: 8000, // 8s max — on ne bloque pas si l'API est lente
    });

    const hourly = response.data?.hourly;

    if (!hourly || !hourly.precipitation || !hourly.wind_speed_10m) {
      return { precipitation_mm: 0, wind_speed_kmh: 0 };
    }

    // Les données sont retournées heure par heure pour toute la journée (24 valeurs)
    // On prend la valeur à l'heure de départ de l'activité
    const safeHour = Math.min(Math.max(hour, 0), 23);
    const precipitation_mm = hourly.precipitation[safeHour] ?? 0;
    const wind_speed_kmh   = hourly.wind_speed_10m[safeHour] ?? 0;

    return { precipitation_mm, wind_speed_kmh };

  } catch (err) {
    // On ne fait pas échouer toute l'analyse si la météo d'une sortie est indisponible
    // (API down, coordonnées invalides, date trop ancienne)
    if (err.code === 'ECONNABORTED') {
      console.warn(`[MÉTÉO] Timeout pour lat=${lat}, lon=${lon}, date=${dateStr}`);
    } else {
      console.warn(`[MÉTÉO] Données indisponibles pour ${dateStr} :`, err.message);
    }
    return { precipitation_mm: 0, wind_speed_kmh: 0 };
  }
}

/**
 * Analyse les conditions météo pour un tableau d'activités Strava.
 * Fait les appels Open-Meteo en parallèle (avec une concurrence limitée à 5
 * pour ne pas surcharger l'API gratuite).
 *
 * @param {Array} rides - Liste d'activités Strava (avec start_latlng et start_date)
 * @returns {Array} rides enrichies avec { precipitation_mm, wind_speed_kmh }
 */
async function enrichRidesWithWeather(rides) {
  // On ne garde que les rides avec des coordonnées GPS (les rides indoor n'en ont pas)
  const ridesWithGPS = rides.filter(r =>
    r.start_latlng && r.start_latlng.length === 2
  );

  console.log(`[MÉTÉO] Analyse météo pour ${ridesWithGPS.length}/${rides.length} rides (avec GPS)`);

  // Traitement par batch de 5 requêtes simultanées max
  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < ridesWithGPS.length; i += BATCH_SIZE) {
    const batch = ridesWithGPS.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (ride) => {
        const [lat, lon] = ride.start_latlng;
        const startDate  = new Date(ride.start_date);
        const dateStr    = startDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
        const hour       = startDate.getHours();

        const weather = await getWeatherForRide(lat, lon, dateStr, hour);
        return { ...ride, weather };
      })
    );

    results.push(...batchResults);
  }

  // Les rides sans GPS sont ajoutées sans données météo
  const ridesWithoutGPS = rides
    .filter(r => !r.start_latlng || r.start_latlng.length !== 2)
    .map(r => ({ ...r, weather: { precipitation_mm: 0, wind_speed_kmh: 0 } }));

  return [...results, ...ridesWithoutGPS];
}

module.exports = { getWeatherForRide, enrichRidesWithWeather };
