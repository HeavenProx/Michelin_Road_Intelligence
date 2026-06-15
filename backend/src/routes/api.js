/**
 * routes/api.js — Endpoints métier
 *
 * GET  /api/profile      → profil cycliste calculé depuis Strava
 * GET  /api/recommend    → recommandation pneu Michelin
 * POST /api/tyre-score   → estimation d'usure d'un pneu installé
 * GET  /api/demo         → données fictives pour démo sans compte Strava
 */

const express = require('express');
const router = express.Router();
const { getRecentRides } = require('../services/strava');
const { buildProfile }   = require('../services/profiler');
const { recommend }      = require('../services/recommender');
const tiresData          = require('../data/tires.json');

// ─── Cache mémoire léger ────────────────────────────────────────────────────
// Évite de recalculer le profil à chaque requête /api/recommend.
// La clé est l'id Strava de l'athlète, valeur = { profile, timestamp }.
const profileCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Récupère le profil depuis le cache ou le recalcule.
 */
async function getOrBuildProfile(session) {
  const athleteId = session.athlete?.id;
  if (!athleteId) {
    throw Object.assign(new Error('Non authentifié'), { status: 401 });
  }

  const cached = profileCache.get(athleteId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log('[API] Profil récupéré depuis le cache');
    return cached.profile;
  }

  const rides   = await getRecentRides(session);
  const profile = await buildProfile(rides);

  profileCache.set(athleteId, { profile, timestamp: Date.now() });
  return profile;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/profile
// ──────────────────────────────────────────────────────────────────────────────
router.get('/profile', async (req, res, next) => {
  try {
    const profile = await getOrBuildProfile(req.session);
    res.json({
      success: true,
      athlete: req.session.athlete,
      profile,
    });
  } catch (err) {
    next(err); // délégué au gestionnaire d'erreurs global de app.js
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/recommend
// ──────────────────────────────────────────────────────────────────────────────
router.get('/recommend', async (req, res, next) => {
  try {
    const profile        = await getOrBuildProfile(req.session);
    const recommendation = recommend(profile);

    res.json({
      success: true,
      athlete: req.session.athlete,
      ...recommendation,
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/tyre-score
// Body: { tire_id, install_date, current_mileage_override? }
// ──────────────────────────────────────────────────────────────────────────────
router.post('/tyre-score', async (req, res, next) => {
  try {
    const { tire_id, install_date, current_mileage_override } = req.body;

    // Validation des paramètres
    if (!tire_id || !install_date) {
      return res.status(400).json({
        error: true,
        message: 'Paramètres manquants : tire_id et install_date sont requis',
      });
    }

    // Recherche du pneu dans le catalogue
    const tire = tiresData.tires.find(t => t.id === tire_id);
    if (!tire) {
      return res.status(404).json({
        error: true,
        message: `Pneu "${tire_id}" introuvable dans le catalogue`,
        available_ids: tiresData.tires.map(t => t.id),
      });
    }

    // Calcul du kilométrage accumulé depuis l'installation
    let currentMileage;

    if (current_mileage_override !== undefined) {
      // L'utilisateur donne son kilométrage directement (ex: compteur vélo)
      currentMileage = Number(current_mileage_override);
    } else if (req.session.tokens) {
      // On déduit depuis les activités Strava depuis install_date
      const installTimestamp = Math.floor(new Date(install_date).getTime() / 1000);
      const rides = await getRecentRides(req.session);
      const ridesAfterInstall = rides.filter(r =>
        Math.floor(new Date(r.start_date).getTime() / 1000) >= installTimestamp
      );
      const totalMeters = ridesAfterInstall.reduce((s, r) => s + (r.distance || 0), 0);
      currentMileage = Math.round(totalMeters / 1000);
    } else {
      return res.status(400).json({
        error: true,
        message: 'Connectez-vous à Strava ou fournissez current_mileage_override pour estimer l\'usure',
      });
    }

    // Calcul de l'usure
    const lifetime    = tire.lifetime_km;
    const wearPct     = Math.min(Math.round((currentMileage / lifetime) * 100), 100);
    const remainingKm = Math.max(lifetime - currentMileage, 0);

    // Niveau d'alerte
    let alertLevel, message;
    if (wearPct >= 90) {
      alertLevel = 'replace';
      message    = `⚠️ Ton ${tire.full_name} est usé à ${wearPct}%. Il est temps de le remplacer immédiatement — continuer avec ce pneu est risqué.`;
    } else if (wearPct >= 70) {
      alertLevel = 'warning';
      message    = `🔶 Ton ${tire.full_name} affiche ${wearPct}% d'usure. Il te reste environ ${remainingKm} km — pense à anticiper le remplacement.`;
    } else {
      alertLevel = 'ok';
      message    = `✅ Ton ${tire.full_name} est en bon état (${wearPct}% d'usure). Il te reste encore environ ${remainingKm} km de bonne route.`;
    }

    res.json({
      success: true,
      tire: {
        id:        tire.id,
        name:      tire.full_name,
        lifetime_km: lifetime,
      },
      wear: {
        current_mileage_km:  currentMileage,
        wear_percentage:     wearPct,
        estimated_remaining_km: remainingKm,
        alert_level:         alertLevel,
        recommendation_message: message,
      },
      install_date,
    });

  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/demo
// Profil fictif d'un cycliste parisien — fonctionne sans compte Strava
// ──────────────────────────────────────────────────────────────────────────────
router.get('/demo', (req, res) => {
  const demoProfile = {
    ride_count:         47,
    total_distance_km:  2840,
    monthly_distance:   473,
    avg_speed_kmh:      27,
    avg_elevation_m:    412,
    dominant_terrain:   'mountain',
    ride_style:         'tempo',
    terrain_label:      'Montagne',
    style_label:        'Tempo',
    weather_exposure: {
      rain_percentage:  22,
      wind_percentage:  18,
      rainy_rides:      10,
    },
    region:             'Île-de-France / Nord',
  };

  const demoAthlete = {
    id:        99999,
    firstname: 'Alex',
    lastname:  'Dupont',
    city:      'Paris',
    country:   'France',
    profile:   null,
  };

  const recommendation = recommend(demoProfile);

  res.json({
    success: true,
    demo:    true,
    notice:  'Ces données sont fictives — connectez-vous à Strava pour votre profil réel',
    athlete: demoAthlete,
    profile: demoProfile,
    ...recommendation,
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/tires — Catalogue complet des pneus
// ──────────────────────────────────────────────────────────────────────────────
router.get('/tires', (req, res) => {
  res.json({
    success: true,
    count:   tiresData.tires.length,
    tires:   tiresData.tires.map(t => ({
      id:          t.id,
      name:        t.full_name,
      category:    t.category,
      description: t.description,
      scores:      t.scores,
      lifetime_km: t.lifetime_km,
      price_range: t.price_range,
      tags:        t.tags,
    })),
  });
});

module.exports = router;
