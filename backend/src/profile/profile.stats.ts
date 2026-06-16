import type { CyclingActivity } from '../strava/strava.types';
import type { User } from '../users/user.entity';
import type { RiderProfile } from './profile.types';

const MS_PER_DAY = 86_400_000;
const NEUTRAL_LABEL = 'Données insuffisantes';

/** Arrondi à une décimale. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function rideCount(activities: CyclingActivity[]): number {
  return activities.length;
}

export function totalDistanceKm(activities: CyclingActivity[]): number {
  const sum = activities.reduce((acc, a) => acc + a.distanceKm, 0);
  return round1(sum);
}

/** Vraie moyenne pondérée par la distance : Σ km / (Σ s de mouvement / 3600). */
export function avgSpeedKmh(activities: CyclingActivity[]): number {
  const distKm = activities.reduce((acc, a) => acc + a.distanceKm, 0);
  const movingS = activities.reduce((acc, a) => acc + a.movingTimeS, 0);
  if (movingS === 0) return 0;
  return round1(distKm / (movingS / 3600));
}

/** Dénivelé moyen PAR SORTIE (Σ D+ / nb de sorties). */
export function avgElevationM(activities: CyclingActivity[]): number {
  if (activities.length === 0) return 0;
  const sum = activities.reduce((acc, a) => acc + a.totalElevationGainM, 0);
  return Math.round(sum / activities.length);
}

export function monthlyDistance(activities: CyclingActivity[], now: Date): number {
  if (activities.length === 0) return 0;
  const total = activities.reduce((acc, a) => acc + a.distanceKm, 0);
  const firstMs = Math.min(...activities.map((a) => new Date(a.startDate).getTime()));
  const days = (now.getTime() - firstMs) / MS_PER_DAY;
  const monthsCovered = Math.max(1, Math.ceil(days / 30));
  return Math.round(total / monthsCovered);
}

/** Densité de grimpe = dénivelé total / distance totale (m/km). */
export function terrainLabel(activities: CyclingActivity[]): string {
  const dist = activities.reduce((acc, a) => acc + a.distanceKm, 0);
  if (dist === 0) return 'Plat';
  const elev = activities.reduce((acc, a) => acc + a.totalElevationGainM, 0);
  const density = elev / dist;
  if (density < 8) return 'Plat';
  if (density <= 18) return 'Mixte';
  return 'Montagne';
}

/** Type de sport le plus fréquent dans l'échantillon. */
function dominantSportType(activities: CyclingActivity[]): string {
  const counts = new Map<string, number>();
  for (const a of activities) {
    counts.set(a.sportType, (counts.get(a.sportType) ?? 0) + 1);
  }
  let best = '';
  let bestCount = -1;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

/** Échelle de priorité : type dominant, puis vitesse, puis distance moyenne. */
export function styleLabel(activities: CyclingActivity[]): string {
  if (activities.length === 0) return NEUTRAL_LABEL;
  const dominant = dominantSportType(activities);
  if (dominant === 'MountainBikeRide') return 'VTT';
  if (dominant === 'GravelRide') return 'Gravel';

  const speed = avgSpeedKmh(activities);
  const distPerRide =
    activities.reduce((acc, a) => acc + a.distanceKm, 0) / activities.length;
  if (speed >= 28) return 'Performance';
  if (distPerRide >= 60) return 'Endurance';
  return 'Loisir / polyvalent';
}

export function resolveRegion(
  user: Pick<User, 'city' | 'state' | 'country'>,
): string {
  const place = user.city ?? user.state ?? null;
  return [place, user.country].filter(Boolean).join(', ');
}

/**
 * Assemble la partie déterministe du profil (tout sauf weather_exposure).
 * Court-circuite le cas « aucune activité » avec des labels neutres.
 */
export function computeProfileStats(
  activities: CyclingActivity[],
  user: Pick<User, 'city' | 'state' | 'country'>,
  now: Date,
): Omit<RiderProfile, 'weather_exposure'> {
  if (activities.length === 0) {
    return {
      ride_count: 0,
      total_distance_km: 0,
      monthly_distance: 0,
      avg_speed_kmh: 0,
      avg_elevation_m: 0,
      terrain_label: NEUTRAL_LABEL,
      style_label: NEUTRAL_LABEL,
      region: resolveRegion(user),
    };
  }

  return {
    ride_count: rideCount(activities),
    total_distance_km: totalDistanceKm(activities),
    monthly_distance: monthlyDistance(activities, now),
    avg_speed_kmh: avgSpeedKmh(activities),
    avg_elevation_m: avgElevationM(activities),
    terrain_label: terrainLabel(activities),
    style_label: styleLabel(activities),
    region: resolveRegion(user),
  };
}
