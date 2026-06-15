/**
 * services/strava.js — Wrapper pour l'API Strava
 *
 * Responsabilités :
 *  - Vérifier si l'access_token est encore valide (expires_at)
 *  - Le renouveler automatiquement via refresh_token si expiré
 *  - Fournir des fonctions typées pour récupérer les activités
 */

const axios = require('axios');

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

/**
 * Vérifie si l'access_token est expiré et le renouvelle si besoin.
 * Met à jour les tokens directement dans req.session.tokens.
 *
 * @param {object} session - req.session (modifié en place si refresh nécessaire)
 * @returns {string} access_token valide
 */
async function getValidToken(session) {
  if (!session.tokens) {
    throw Object.assign(new Error('Non authentifié — connectez-vous via /auth/strava'), { status: 401 });
  }

  const { access_token, refresh_token, expires_at } = session.tokens;

  // Strava donne expires_at en secondes UNIX — on compare avec l'heure actuelle
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const isExpired = expires_at - nowInSeconds < 60; // marge de 60s pour éviter les races

  if (!isExpired) {
    return access_token; // token encore valide, on le renvoie directement
  }

  console.log('[STRAVA] Token expiré — renouvellement via refresh_token...');

  try {
    const response = await axios.post(STRAVA_TOKEN_URL, {
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type:    'refresh_token',
      refresh_token,
    });

    // Mise à jour en session (en mémoire)
    session.tokens = {
      access_token:  response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at:    response.data.expires_at,
    };

    console.log('[STRAVA] ✓ Token renouvelé, expire dans',
      response.data.expires_at - nowInSeconds, 'secondes');

    return session.tokens.access_token;

  } catch (err) {
    console.error('[STRAVA] Échec du renouvellement du token :', err.response?.data || err.message);
    throw Object.assign(
      new Error('Session expirée — veuillez vous reconnecter via Strava'),
      { status: 401 }
    );
  }
}

/**
 * Crée un client Axios préconfiguré avec le token valide.
 * Factorisation pour éviter de répéter les headers dans chaque appel.
 */
async function createStravaClient(session) {
  const token = await getValidToken(session);
  return axios.create({
    baseURL: STRAVA_API_BASE,
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Récupère les activités de l'athlète connecté.
 *
 * @param {object} session - req.session
 * @param {object} options
 * @param {number} options.before  - timestamp Unix (filtre activités avant cette date)
 * @param {number} options.after   - timestamp Unix (filtre activités après cette date)
 * @param {number} options.perPage - nombre d'activités par page (max 200)
 * @param {number} options.page    - numéro de page
 * @returns {Array} liste brute des activités Strava
 */
async function getActivities(session, { before, after, perPage = 100, page = 1 } = {}) {
  const client = await createStravaClient(session);

  try {
    const response = await client.get('/athlete/activities', {
      params: {
        before,
        after,
        per_page: perPage,
        page,
      },
    });

    return response.data;

  } catch (err) {
    const status = err.response?.status;

    if (status === 401) {
      throw Object.assign(new Error('Token Strava invalide — reconnectez-vous'), { status: 401 });
    }
    if (status === 429) {
      throw Object.assign(new Error('Limite de requêtes Strava atteinte (rate limit) — réessayez dans quelques minutes'), { status: 429 });
    }

    console.error('[STRAVA] Erreur API :', err.response?.data || err.message);
    throw new Error('Impossible de récupérer les activités Strava');
  }
}

/**
 * Récupère les 100 activités de type "Ride" des 6 derniers mois.
 * C'est la fonction principale utilisée par le profiler.
 *
 * @param {object} session - req.session
 * @returns {Array} activités filtrées (seulement les rides vélo)
 */
async function getRecentRides(session) {
  const now = Math.floor(Date.now() / 1000);
  const sixMonthsAgo = now - (6 * 30 * 24 * 60 * 60); // ~6 mois en secondes

  const activities = await getActivities(session, {
    after:   sixMonthsAgo,
    before:  now,
    perPage: 100,
    page:    1,
  });

  // Filtrage sur le type "Ride" (exclut les courses à pied, natation, etc.)
  const rides = activities.filter(a => a.type === 'Ride' || a.type === 'VirtualRide');

  console.log(`[STRAVA] ${rides.length} rides vélo trouvés sur les 6 derniers mois`);
  return rides;
}

module.exports = { getValidToken, getActivities, getRecentRides };
