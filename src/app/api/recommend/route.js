import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getRecentRides } from '@/services/strava'
import { buildProfile } from '@/services/profiler'
import { recommend } from '@/services/recommender'

const profileCache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

export async function GET() {
  try {
    const session   = await getSession()
    const athleteId = session.athlete?.id

    if (!athleteId) {
      return NextResponse.json({ error: true, message: 'Non authentifié' }, { status: 401 })
    }

    let profile = profileCache.get(athleteId)?.profile
    if (!profile || Date.now() - profileCache.get(athleteId).timestamp > CACHE_TTL_MS) {
      const rides = await getRecentRides(session)
      profile = await buildProfile(rides)
      profileCache.set(athleteId, { profile, timestamp: Date.now() })
    }

    const recommendation = recommend(profile)
    return NextResponse.json({ success: true, athlete: session.athlete, ...recommendation })

  } catch (err) {
    return NextResponse.json(
      { error: true, message: err.message },
      { status: err.status || 500 }
    )
  }
}
