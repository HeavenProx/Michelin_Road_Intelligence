import { NextResponse } from 'next/server'
import { recommend } from '@/services/recommender'

export async function GET() {
  const demoProfile = {
    ride_count: 47, total_distance_km: 2840, monthly_distance: 473,
    avg_speed_kmh: 27, avg_elevation_m: 412,
    dominant_terrain: 'mountain', ride_style: 'tempo',
    terrain_label: 'Montagne', style_label: 'Tempo',
    weather_exposure: { rain_percentage: 22, wind_percentage: 18, rainy_rides: 10 },
    region: 'Île-de-France / Nord',
  }

  const recommendation = recommend(demoProfile)

  return NextResponse.json({
    success: true, demo: true,
    notice:  'Données fictives — connectez-vous à Strava pour votre profil réel',
    athlete: { id: 99999, firstname: 'Alex', lastname: 'Dupont', city: 'Paris', country: 'France' },
    profile: demoProfile,
    ...recommendation,
  })
}
