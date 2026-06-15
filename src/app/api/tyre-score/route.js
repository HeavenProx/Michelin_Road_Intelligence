import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getActivities } from '@/services/strava'
import tiresData from '@/data/tires.json'

export async function POST(request) {
  try {
    const body = await request.json()
    const { tire_id, install_date, current_mileage_override } = body

    if (!tire_id || !install_date) {
      return NextResponse.json(
        { error: true, message: 'Paramètres manquants : tire_id et install_date requis' },
        { status: 400 }
      )
    }

    const tire = tiresData.tires.find(t => t.id === tire_id)
    if (!tire) {
      return NextResponse.json(
        { error: true, message: `Pneu "${tire_id}" introuvable`, available_ids: tiresData.tires.map(t => t.id) },
        { status: 404 }
      )
    }

    let currentMileage

    if (current_mileage_override !== undefined) {
      currentMileage = Number(current_mileage_override)
    } else {
      const session = await getSession()
      if (!session.tokens) {
        return NextResponse.json(
          { error: true, message: 'Connectez-vous à Strava ou fournissez current_mileage_override' },
          { status: 400 }
        )
      }
      const installTs = Math.floor(new Date(install_date).getTime() / 1000)
      const now       = Math.floor(Date.now() / 1000)
      const rides     = await getActivities(session, { after: installTs, before: now, perPage: 200 })
      const filtered  = rides.filter(r => r.type === 'Ride' || r.type === 'VirtualRide')
      currentMileage  = Math.round(filtered.reduce((s, r) => s + (r.distance || 0), 0) / 1000)
    }

    const wearPct     = Math.min(Math.round((currentMileage / tire.lifetime_km) * 100), 100)
    const remainingKm = Math.max(tire.lifetime_km - currentMileage, 0)

    let alertLevel, message
    if (wearPct >= 90) {
      alertLevel = 'replace'
      message    = `⚠️ Ton ${tire.full_name} est usé à ${wearPct}%. Remplacement immédiat recommandé — continuer est risqué.`
    } else if (wearPct >= 70) {
      alertLevel = 'warning'
      message    = `🔶 Ton ${tire.full_name} affiche ${wearPct}% d'usure. Il te reste ~${remainingKm} km — anticipe le remplacement.`
    } else {
      alertLevel = 'ok'
      message    = `✅ Ton ${tire.full_name} est en bon état (${wearPct}% d'usure). ~${remainingKm} km restants.`
    }

    return NextResponse.json({
      success: true,
      tire:    { id: tire.id, name: tire.full_name, lifetime_km: tire.lifetime_km },
      wear:    { current_mileage_km: currentMileage, wear_percentage: wearPct, estimated_remaining_km: remainingKm, alert_level: alertLevel, recommendation_message: message },
      install_date,
    })

  } catch (err) {
    return NextResponse.json(
      { error: true, message: err.message },
      { status: err.status || 500 }
    )
  }
}
