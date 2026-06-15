/**
 * routes/auth.js — OAuth 2.0 Strava
 *
 * Flow complet :
 *   1. L'utilisateur clique "Connecter Strava" → GET /auth/strava
 *   2. Strava redirige vers /auth/callback?code=XYZ
 *   3. On échange le code contre access_token + refresh_token
 *   4. On stocke les tokens en session et on redirige le frontend
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

// ─── Étape 1 : Redirection vers Strava ─────────────────────────────────────
// Le navigateur est redirigé vers la page de login Strava avec les paramètres OAuth
router.get('/strava', (req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.STRAVA_CLIENT_ID,
    redirect_uri:  process.env.STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    // read = infos de base, activity:read_all = toutes les activités (y compris privées)
    scope: 'read,activity:read_all',
  });

  const redirectUrl = `${STRAVA_AUTH_URL}?${params.toString()}`;
  console.log('[AUTH] Redirection OAuth vers Strava →', redirectUrl);
  res.redirect(redirectUrl);
});

// ─── Étape 2 : Callback Strava ──────────────────────────────────────────────
// Strava nous renvoie un `code` temporaire → on l'échange contre les tokens réels
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  // L'utilisateur a refusé l'autorisation sur Strava
  if (error || !code) {
    console.warn('[AUTH] Accès refusé par l\'utilisateur ou code manquant');
    return res.redirect('http://localhost:3000?auth=denied');
  }

  try {
    // Échange du code temporaire contre les tokens Strava
    const tokenResponse = await axios.post(STRAVA_TOKEN_URL, {
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data;

    // Stockage des tokens dans la session Express (en mémoire RAM)
    req.session.tokens = {
      access_token,
      refresh_token,
      expires_at,  // timestamp Unix (secondes) d'expiration de l'access_token
    };

    // On conserve les infos de base de l'athlète pour l'affichage
    req.session.athlete = {
      id:         athlete.id,
      firstname:  athlete.firstname,
      lastname:   athlete.lastname,
      profile:    athlete.profile,  // URL photo
      city:       athlete.city,
      country:    athlete.country,
    };

    console.log(`[AUTH] ✓ Connecté : ${athlete.firstname} ${athlete.lastname} (id: ${athlete.id})`);

    // Redirection vers le frontend avec indication de succès
    res.redirect(`http://localhost:3000?auth=success`);

  } catch (err) {
    console.error('[AUTH] Erreur échange de token :', err.response?.data || err.message);
    res.redirect('http://localhost:3000?auth=error');
  }
});

// ─── Déconnexion ────────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Déconnecté avec succès' });
});

// ─── Statut de connexion ────────────────────────────────────────────────────
// Permet au frontend de savoir si l'utilisateur est connecté sans refaire le flow OAuth
router.get('/status', (req, res) => {
  if (req.session.tokens && req.session.athlete) {
    res.json({
      connected: true,
      athlete: req.session.athlete,
    });
  } else {
    res.json({ connected: false });
  }
});

module.exports = router;
