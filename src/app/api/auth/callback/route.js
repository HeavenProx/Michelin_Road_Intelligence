/**
 * GET /api/auth/callback — Reçoit le code Strava et l'échange contre les tokens
 */

import { NextResponse } from 'next/server'
import axios from 'axios'
import { getSession } from '@/lib/session'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    console.warn('[AUTH] Accès refusé ou code manquant')
    return NextResponse.redirect(new URL('/?auth=denied', request.url))
  }

  try {
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type:    'authorization_code',
    })

    const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data

    const session = await getSession()
    session.tokens = { access_token, refresh_token, expires_at }
    session.athlete = {
      id:        athlete.id,
      firstname: athlete.firstname,
      lastname:  athlete.lastname,
      profile:   athlete.profile,
      city:      athlete.city,
      country:   athlete.country,
    }
    // iron-session ne sauvegarde pas automatiquement — appel explicite obligatoire
    await session.save()

    console.log(`[AUTH] ✓ Connecté : ${athlete.firstname} ${athlete.lastname}`)
    return NextResponse.redirect(new URL('/?auth=success', request.url))

  } catch (err) {
    console.error('[AUTH] Erreur échange token :', err.response?.data || err.message)
    return NextResponse.redirect(new URL('/?auth=error', request.url))
  }
}
