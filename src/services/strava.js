/**
 * services/strava.js — Wrapper API Strava
 * Même logique qu'avant, adapté pour iron-session :
 * session.save() doit être appelé explicitement après modification.
 */

import axios from 'axios'

const STRAVA_API_BASE = 'https://www.strava.com/api/v3'
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

/**
 * Vérifie et renouvelle le token si expiré.
 * Appelle session.save() si le token a été rafraîchi.
 *
 * @param {object} session - Session iron-session (avec .tokens et .save())
 * @returns {string} access_token valide
 */
export async function getValidToken(session) {
  if (!session.tokens) {
    throw Object.assign(new Error('Non authentifié — connectez-vous via Strava'), { status: 401 })
  }

  const { access_token, refresh_token, expires_at } = session.tokens
  const nowInSeconds = Math.floor(Date.now() / 1000)
  const isExpired = expires_at - nowInSeconds < 60

  if (!isExpired) return access_token

  console.log('[STRAVA] Token expiré — renouvellement...')

  try {
    const response = await axios.post(STRAVA_TOKEN_URL, {
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type:    'refresh_token',
      refresh_token,
    })

    session.tokens = {
      access_token:  response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at:    response.data.expires_at,
    }
    // Avec iron-session, la session ne se sauvegarde pas automatiquement
    await session.save()

    console.log('[STRAVA] ✓ Token renouvelé')
    return session.tokens.access_token

  } catch (err) {
    console.error('[STRAVA] Échec refresh :', err.response?.data || err.message)
    throw Object.assign(new Error('Session expirée — reconnectez-vous'), { status: 401 })
  }
}

/**
 * Crée un client Axios préconfiguré avec le token valide.
 */
async function createStravaClient(session) {
  const token = await getValidToken(session)
  return axios.create({
    baseURL: STRAVA_API_BASE,
    headers: { Authorization: `Bearer ${token}` },
  })
}

/**
 * Récupère les activités Strava avec filtres optionnels.
 */
export async function getActivities(session, { before, after, perPage = 100, page = 1 } = {}) {
  const client = await createStravaClient(session)

  try {
    const response = await client.get('/athlete/activities', {
      params: { before, after, per_page: perPage, page },
    })
    return response.data

  } catch (err) {
    const status = err.response?.status
    if (status === 401) throw Object.assign(new Error('Token Strava invalide — reconnectez-vous'), { status: 401 })
    if (status === 429) throw Object.assign(new Error('Limite Strava atteinte — réessayez dans quelques minutes'), { status: 429 })
    throw new Error('Impossible de récupérer les activités Strava')
  }
}

/**
 * Récupère les rides vélo des 6 derniers mois (max 100).
 */
export async function getRecentRides(session) {
  const now = Math.floor(Date.now() / 1000)
  const sixMonthsAgo = now - (6 * 30 * 24 * 60 * 60)

  const activities = await getActivities(session, {
    after: sixMonthsAgo, before: now, perPage: 100, page: 1,
  })

  const rides = activities.filter(a => a.type === 'Ride' || a.type === 'VirtualRide')
  console.log(`[STRAVA] ${rides.length} rides trouvés sur 6 mois`)
  return rides
}
