/**
 * services/weather.js — Wrapper Open-Meteo (météo historique gratuite, sans clé)
 */

import axios from 'axios'

const OPEN_METEO_BASE = 'https://archive-api.open-meteo.com/v1/archive'

export async function getWeatherForRide(lat, lon, dateStr, hour) {
  try {
    const response = await axios.get(OPEN_METEO_BASE, {
      params: {
        latitude:   lat,
        longitude:  lon,
        start_date: dateStr,
        end_date:   dateStr,
        hourly:     'precipitation,wind_speed_10m',
        timezone:   'Europe/Paris',
      },
      timeout: 8000,
    })

    const hourly = response.data?.hourly
    if (!hourly) return { precipitation_mm: 0, wind_speed_kmh: 0 }

    const safeHour = Math.min(Math.max(hour, 0), 23)
    return {
      precipitation_mm: hourly.precipitation[safeHour] ?? 0,
      wind_speed_kmh:   hourly.wind_speed_10m[safeHour] ?? 0,
    }

  } catch (err) {
    console.warn(`[MÉTÉO] Données indisponibles pour ${dateStr} :`, err.message)
    return { precipitation_mm: 0, wind_speed_kmh: 0 }
  }
}

/**
 * Enrichit un tableau de rides avec les données météo (batch de 5 requêtes parallèles).
 */
export async function enrichRidesWithWeather(rides) {
  const ridesWithGPS    = rides.filter(r => r.start_latlng?.length === 2)
  const ridesWithoutGPS = rides.filter(r => !r.start_latlng?.length)

  console.log(`[MÉTÉO] Analyse météo pour ${ridesWithGPS.length}/${rides.length} rides`)

  const BATCH_SIZE = 5
  const results = []

  for (let i = 0; i < ridesWithGPS.length; i += BATCH_SIZE) {
    const batch = ridesWithGPS.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (ride) => {
        const [lat, lon] = ride.start_latlng
        const startDate  = new Date(ride.start_date)
        const dateStr    = startDate.toISOString().split('T')[0]
        const hour       = startDate.getHours()
        const weather    = await getWeatherForRide(lat, lon, dateStr, hour)
        return { ...ride, weather }
      })
    )
    results.push(...batchResults)
  }

  return [
    ...results,
    ...ridesWithoutGPS.map(r => ({ ...r, weather: { precipitation_mm: 0, wind_speed_kmh: 0 } })),
  ]
}
