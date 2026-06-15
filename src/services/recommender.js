/**
 * services/recommender.js — Moteur de recommandation pneu Michelin
 * Scoring basé sur des règles métier dans tires.json (aucun ML).
 */

import tiresData from '../data/tires.json'

function scoreTire(tire, profile) {
  const { scores, best_for } = tire
  const { terrain_weights, style_weights, weather_bonus } = tiresData.recommendation_rules

  const terrainOk = best_for.terrains.includes(profile.dominant_terrain)
  const styleOk   = best_for.styles.includes(profile.ride_style)

  if (!terrainOk && !styleOk) return 5
  if (!terrainOk) return 20

  const tW = terrain_weights[profile.dominant_terrain] || terrain_weights['flat']
  let baseScore = 0
  baseScore += (scores.wet_grip            / 5) * tW.wet_grip            * 100
  baseScore += (scores.rolling_resistance  / 5) * tW.rolling_resistance  * 100
  baseScore += (scores.durability          / 5) * tW.durability          * 100
  baseScore += (scores.terrain_versatility / 5) * tW.terrain_versatility * 100

  const sW = style_weights[profile.ride_style] || style_weights['endurance']
  let styleScore = 0
  styleScore += (scores.rolling_resistance  / 5) * sW.rolling_resistance  * 100
  styleScore += (scores.wet_grip            / 5) * sW.wet_grip            * 100
  styleScore += (scores.terrain_versatility / 5) * sW.terrain_versatility * 100
  styleScore += (scores.durability          / 5) * sW.durability          * 100

  let finalScore = (baseScore * 0.6) + (styleScore * 0.4)

  if (profile.weather_exposure.rain_percentage >= weather_bonus.rain_threshold_pct) {
    finalScore += (scores.wet_grip / 5) * weather_bonus.wet_grip_bonus * 10
  }
  if (styleOk) finalScore += 5

  return Math.min(Math.round(finalScore), 100)
}

function generateExplanation(tire, profile) {
  const { ride_count, dominant_terrain, ride_style, weather_exposure, monthly_distance, avg_elevation_m } = profile
  const terrainFr = { mountain: 'en montagne', hilly: 'en terrain vallonné', flat: 'sur le plat' }[dominant_terrain]
  const styleFr   = { endurance: 'en mode endurance', tempo: 'à allure tempo', racing: 'à vitesse de course' }[ride_style]

  let phrase1 = `Sur tes ${ride_count} sorties analysées, tu roules principalement ${terrainFr} ${styleFr}`
  if (monthly_distance > 0) phrase1 += `, avec une moyenne de ${monthly_distance} km/mois`
  if (avg_elevation_m > 100) phrase1 += ` et ${avg_elevation_m}m de D+ moyen par sortie`
  phrase1 += '.'

  let phrase2 = ''
  if (weather_exposure.rain_percentage >= 20) {
    phrase2 = `Avec ${weather_exposure.rain_percentage}% de tes sorties sous la pluie (${weather_exposure.rainy_rides} rides mouillés), l'adhérence par temps humide est prioritaire. `
  } else if (weather_exposure.rain_percentage > 0) {
    phrase2 = `Tu roules ${weather_exposure.rain_percentage}% du temps sous la pluie, donc un bon wet_grip reste utile. `
  }

  const phrase3 = `Le ${tire.full_name} est idéal pour ton profil : ${tire.description.toLowerCase()}`
  return `${phrase1} ${phrase2}${phrase3}`
}

export function recommend(profile) {
  const scored = tiresData.tires
    .map(tire => ({ ...tire, match_score: scoreTire(tire, profile) }))
    .sort((a, b) => b.match_score - a.match_score)

  const [primary, alt1, alt2] = scored

  return {
    recommended: {
      id:          primary.id,
      name:        primary.full_name,
      category:    primary.category,
      description: primary.description,
      match_score: primary.match_score,
      scores:      primary.scores,
      lifetime_km: primary.lifetime_km,
      price_range: primary.price_range,
      tags:        primary.tags,
    },
    alternatives: [alt1, alt2].map(t => ({
      id:          t.id,
      name:        t.full_name,
      category:    t.category,
      match_score: t.match_score,
      description: t.description,
      price_range: t.price_range,
    })),
    explanation:  generateExplanation(primary, profile),
    profile_used: profile,
  }
}
