/**
 * services/profiler.js — Calcul du profil cycliste depuis les activités Strava
 */

import { enrichRidesWithWeather } from './weather.js'

const toKm = (meters) => Math.round(meters / 100) / 10

function calcDominantTerrain(rides) {
  if (!rides.length) return 'flat'
  const totalDistanceKm = rides.reduce((s, r) => s + (r.distance || 0), 0) / 1000
  const totalElevation  = rides.reduce((s, r) => s + (r.total_elevation_gain || 0), 0)
  if (totalDistanceKm === 0) return 'flat'
  const ratioMperKm = totalElevation / totalDistanceKm
  if (ratioMperKm > 15) return 'mountain'
  if (ratioMperKm >= 8) return 'hilly'
  return 'flat'
}

function calcMonthlyDistance(rides) {
  if (!rides.length) return 0
  const totalKm   = toKm(rides.reduce((s, r) => s + (r.distance || 0), 0))
  const months    = new Set(rides.map(r => r.start_date.substring(0, 7)))
  return Math.round(totalKm / Math.max(months.size, 1))
}

function calcRideStyle(rides) {
  const valid = rides.filter(r => r.average_speed > 0)
  if (!valid.length) return 'endurance'
  const avgKmh = (valid.reduce((s, r) => s + r.average_speed, 0) / valid.length) * 3.6
  if (avgKmh > 32) return 'racing'
  if (avgKmh >= 25) return 'tempo'
  return 'endurance'
}

function calcWeatherExposure(ridesWithWeather) {
  if (!ridesWithWeather.length) return { rain_percentage: 0, wind_percentage: 0, rainy_rides: 0 }
  const rainy = ridesWithWeather.filter(r => (r.weather?.precipitation_mm ?? 0) > 1)
  const windy = ridesWithWeather.filter(r => (r.weather?.wind_speed_kmh ?? 0) > 30)
  return {
    rain_percentage: Math.round((rainy.length / ridesWithWeather.length) * 100),
    wind_percentage: Math.round((windy.length / ridesWithWeather.length) * 100),
    rainy_rides:     rainy.length,
  }
}

function calcRegion(rides) {
  const withGPS = rides.filter(r => r.start_latlng?.length === 2)
  if (!withGPS.length) return 'Inconnue'
  const avgLat = withGPS.reduce((s, r) => s + r.start_latlng[0], 0) / withGPS.length
  const avgLon = withGPS.reduce((s, r) => s + r.start_latlng[1], 0) / withGPS.length
  if (avgLat > 47.5 && avgLon > 5.5)  return 'Alpes / Est'
  if (avgLat > 44.5 && avgLon > 2.5)  return 'Massif Central / Auvergne'
  if (avgLat < 44 && avgLon > 0)       return 'Pyrénées / Sud-Ouest'
  if (avgLat > 47 && avgLon < 2)       return 'Normandie / Bretagne'
  if (avgLat > 48.5)                   return 'Île-de-France / Nord'
  if (avgLat < 43.5 && avgLon > 4)    return 'Provence / Côte d\'Azur'
  return 'France'
}

/**
 * Construit le profil complet d'un cycliste depuis ses rides Strava.
 */
export async function buildProfile(rides) {
  if (!rides?.length) {
    throw Object.assign(
      new Error('Aucune activité vélo trouvée sur les 6 derniers mois.'),
      { status: 404 }
    )
  }

  console.log(`[PROFILER] Construction du profil pour ${rides.length} rides...`)
  const ridesWithWeather = await enrichRidesWithWeather(rides)

  const terrain      = calcDominantTerrain(rides)
  const style        = calcRideStyle(rides)
  const monthlyDist  = calcMonthlyDistance(rides)
  const weather      = calcWeatherExposure(ridesWithWeather)
  const region       = calcRegion(rides)
  const avgElevation = Math.round(rides.reduce((s, r) => s + (r.total_elevation_gain || 0), 0) / rides.length)
  const totalKm      = toKm(rides.reduce((s, r) => s + (r.distance || 0), 0))
  const validSpeeds  = rides.filter(r => r.average_speed > 0)
  const avgSpeedKmh  = Math.round(
    validSpeeds.reduce((s, r) => s + r.average_speed * 3.6, 0) / Math.max(validSpeeds.length, 1)
  )

  return {
    ride_count:        rides.length,
    total_distance_km: totalKm,
    monthly_distance:  monthlyDist,
    avg_speed_kmh:     avgSpeedKmh,
    avg_elevation_m:   avgElevation,
    dominant_terrain:  terrain,
    ride_style:        style,
    weather_exposure:  weather,
    region,
    terrain_label: { mountain: 'Montagne', hilly: 'Vallonné', flat: 'Plat' }[terrain],
    style_label:   { endurance: 'Endurance', tempo: 'Tempo', racing: 'Racing' }[style],
  }
}
