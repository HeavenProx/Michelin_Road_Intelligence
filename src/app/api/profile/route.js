import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getRecentRides } from '@/services/strava'
import { buildProfile } from '@/services/profiler'

// Cache mémoire léger (valide en dev — en prod serverless il faut Redis ou similaire)
const profileCache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

export async function GET() {
  try {
    const session   = await getSession()
    const athleteId = session.athlete?.id

    if (!athleteId) {
      return NextResponse.json({ error: true, message: 'Non authentifié' }, { status: 401 })
    }

    const cached = profileCache.get(athleteId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, athlete: session.athlete, profile: cached.profile })
    }

    const rides   = await getRecentRides(session)
    const profile = await buildProfile(rides)
    profileCache.set(athleteId, { profile, timestamp: Date.now() })

    return NextResponse.json({ success: true, athlete: session.athlete, profile })

  } catch (err) {
    return NextResponse.json(
      { error: true, message: err.message },
      { status: err.status || 500 }
    )
  }
}
