/**
 * lib/session.js — Configuration iron-session pour Next.js App Router
 *
 * iron-session stocke les données de session dans un cookie chiffré (AES-256).
 * Pas de base de données, pas de store serveur — le token Strava voyage
 * dans le cookie côté client, chiffré et signé par SESSION_SECRET.
 */

import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

export const sessionOptions = {
  // Clé de chiffrement AES-256 (min 32 caractères)
  password: process.env.SESSION_SECRET,
  cookieName: 'michelin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production', // HTTPS seulement en prod
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 24h en secondes
  },
}

/**
 * Retourne la session iron-session depuis les cookies Next.js.
 * À appeler dans un Route Handler ou une Server Action uniquement.
 */
export async function getSession() {
  // Next.js 15 : cookies() est async, il faut l'awaiter
  return getIronSession(await cookies(), sessionOptions)
}
