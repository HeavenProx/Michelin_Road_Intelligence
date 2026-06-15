/**
 * services/recommender.js — Moteur de recommandation pneu Michelin
 *
 * Algorithme de scoring basé sur des règles métier lisibles (tires.json).
 * Aucun ML — juste des poids et des bonus/malus selon le profil cycliste.
 *
 * Processus :
 *  1. Calculer un score numérique pour chaque pneu selon le profil
 *  2. Filtrer les pneus inadaptés (ex: VTT pour un cycliste de route)
 *  3. Trier et retourner : 1 recommandation principale + 2 alternatives
 *  4. Générer une explication personnalisée en français
 */

const tiresData = require('../data/tires.json');

/**
 * Calcule le score d'un pneu pour un profil cycliste donné.
 * Score entre 0 et 100.
 *
 * @param {object} tire    - Données du pneu depuis tires.json
 * @param {object} profile - Profil cycliste calculé par profiler.js
 * @returns {number} score entre 0 et 100
 */
function scoreTire(tire, profile) {
  const { scores, best_for } = tire;
  const { terrain_weights, style_weights, weather_bonus } = tiresData.recommendation_rules;

  // ── Étape 1 : Pénalités d'incompatibilité ──────────────────────────────
  // Si le terrain dominant du cycliste n'est pas dans les terrains du pneu,
  // on applique une pénalité forte (pneu clairement inadapté)
  const terrainOk = best_for.terrains.includes(profile.dominant_terrain);
  const styleOk   = best_for.styles.includes(profile.ride_style);

  if (!terrainOk && !styleOk) return 5;  // pneu totalement inadapté
  if (!terrainOk) return 20;             // pneu pas pour ce terrain

  // ── Étape 2 : Score pondéré selon le terrain ────────────────────────────
  // Les poids varient selon le terrain : en montagne, durability > rolling_resistance
  const terrainW = terrain_weights[profile.dominant_terrain] || terrain_weights['flat'];
  let baseScore = 0;
  baseScore += (scores.wet_grip           / 5) * terrainW.wet_grip           * 100;
  baseScore += (scores.rolling_resistance / 5) * terrainW.rolling_resistance * 100;
  baseScore += (scores.durability         / 5) * terrainW.durability         * 100;
  baseScore += (scores.terrain_versatility/ 5) * terrainW.terrain_versatility* 100;

  // ── Étape 3 : Bonus style de conduite ───────────────────────────────────
  const styleW = style_weights[profile.ride_style] || style_weights['endurance'];
  let styleScore = 0;
  styleScore += (scores.rolling_resistance / 5) * styleW.rolling_resistance * 100;
  styleScore += (scores.wet_grip           / 5) * styleW.wet_grip           * 100;
  styleScore += (scores.terrain_versatility/ 5) * styleW.terrain_versatility* 100;
  styleScore += (scores.durability         / 5) * styleW.durability         * 100;

  // Moyenne pondérée terrain/style (60% terrain, 40% style)
  let finalScore = (baseScore * 0.6) + (styleScore * 0.4);

  // ── Étape 4 : Bonus pluie ────────────────────────────────────────────────
  // Si le cycliste roule souvent sous la pluie, on booste les pneus avec bon wet_grip
  if (profile.weather_exposure.rain_percentage >= weather_bonus.rain_threshold_pct) {
    const rainBonus = (scores.wet_grip / 5) * weather_bonus.wet_grip_bonus * 10;
    finalScore += rainBonus;
  }

  // ── Étape 5 : Bonus style OK ─────────────────────────────────────────────
  if (styleOk) finalScore += 5;

  return Math.min(Math.round(finalScore), 100);
}

/**
 * Génère l'explication de recommandation en français.
 * Utilise les vraies stats du profil pour personnaliser le message.
 *
 * @param {object} tire    - Pneu recommandé
 * @param {object} profile - Profil du cycliste
 * @returns {string} Explication en 2-3 phrases
 */
function generateExplanation(tire, profile) {
  const { ride_count, dominant_terrain, ride_style, weather_exposure,
          monthly_distance, avg_elevation_m, region } = profile;

  // Phrase 1 : Stats clés du cycliste
  const terrainFr = { mountain: 'en montagne', hilly: 'en terrain vallonné', flat: 'sur le plat' }[dominant_terrain];
  const styleFr   = { endurance: 'en mode endurance', tempo: 'à allure tempo', racing: 'à vitesse de course' }[ride_style];
  let phrase1 = `Sur tes ${ride_count} sorties analysées, tu roules principalement ${terrainFr} ${styleFr}`;
  if (monthly_distance > 0) phrase1 += `, avec une moyenne de ${monthly_distance} km/mois`;
  if (avg_elevation_m > 100) phrase1 += ` et ${avg_elevation_m}m de D+ moyen par sortie`;
  phrase1 += '.';

  // Phrase 2 : Condition météo si significative
  let phrase2 = '';
  if (weather_exposure.rain_percentage >= 20) {
    phrase2 = `Avec ${weather_exposure.rain_percentage}% de tes sorties sous la pluie (${weather_exposure.rainy_rides} rides mouillés), l'adhérence par temps humide est prioritaire. `;
  } else if (weather_exposure.rain_percentage > 0) {
    phrase2 = `Tu roules ${weather_exposure.rain_percentage}% du temps sous la pluie, donc un bon wet_grip reste important. `;
  }

  // Phrase 3 : Justification du pneu
  const phrase3 = `Le ${tire.full_name} est idéal pour ton profil : ${tire.description.toLowerCase()}`;

  return `${phrase1} ${phrase2}${phrase3}`;
}

/**
 * Calcule la recommandation complète pour un profil cycliste.
 *
 * @param {object} profile - Profil calculé par profiler.js
 * @returns {object} Recommandation avec pneu principal, alternatives, explication
 */
function recommend(profile) {
  const tires = tiresData.tires;

  // Score chaque pneu
  const scored = tires.map(tire => ({
    ...tire,
    match_score: scoreTire(tire, profile),
  }));

  // Tri décroissant par score
  scored.sort((a, b) => b.match_score - a.match_score);

  const [primary, alt1, alt2] = scored;

  return {
    recommended: {
      id:           primary.id,
      name:         primary.full_name,
      category:     primary.category,
      description:  primary.description,
      match_score:  primary.match_score,
      scores:       primary.scores,
      lifetime_km:  primary.lifetime_km,
      price_range:  primary.price_range,
      tags:         primary.tags,
    },
    alternatives: [alt1, alt2].map(t => ({
      id:          t.id,
      name:        t.full_name,
      category:    t.category,
      match_score: t.match_score,
      description: t.description,
      price_range: t.price_range,
    })),
    explanation: generateExplanation(primary, profile),
    profile_used: profile,
  };
}

module.exports = { recommend };
