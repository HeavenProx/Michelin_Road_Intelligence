import type { CyclingActivity } from '../strava/strava.types';
import type { TyrePosition } from './garage-tyre.entity';

/** Pneu arrière : porte plus de charge + transmet la puissance → use ~1.9×. */
const POSITION_COEFF: Record<TyrePosition, number> = { FRONT: 1.0, REAR: 1.9 };

/** Disciplines hors-asphalte : abrasion accrue. */
const OFFROAD_SPORTS = new Set([
  'GravelRide',
  'MountainBikeRide',
  'EMountainBikeRide',
]);

export interface TyreScore {
  kmUsed: number;
  kmMaxAdjusted: number;
  kmLeft: number;
  wearPercent: number;
  statusLabel: string;
  coeffTerrainMoyen: number;
}

/** Coefficient terrain d'une activité : 1.0 route, 1.4 offroad. */
export function terrainCoeff(activity: CyclingActivity): number {
  return OFFROAD_SPORTS.has(activity.sportType) ? 1.4 : 1.0;
}

export function statusLabel(wearPercent: number): string {
  if (wearPercent >= 80) return 'À remplacer';
  if (wearPercent >= 55) return 'À surveiller';
  return 'Bon état';
}

/**
 * Estime l'usure d'un pneu depuis sa pose.
 * `kmMaxAjusté = lifetimeKm / (coeffPosition × coeffTerrainMoyen)`,
 * `usure% = kmUsed / kmMaxAjusté`. Exclut home-trainer / saisie manuelle
 * et les activités antérieures à la date de pose.
 */
export function computeTyreScore(
  activities: CyclingActivity[],
  position: TyrePosition,
  lifetimeKm: number,
  mountedDate: string,
  now: Date,
): TyreScore {
  void now; // signature homogène avec les helpers temporels du service
  const mountedMs = new Date(mountedDate).getTime();
  const relevant = activities.filter(
    (a) =>
      !a.trainer && !a.manual && new Date(a.startDate).getTime() >= mountedMs,
  );

  const kmUsed = round1(relevant.reduce((s, a) => s + a.distanceKm, 0));
  const weightedKm = relevant.reduce(
    (s, a) => s + a.distanceKm * terrainCoeff(a),
    0,
  );
  const coeffTerrainMoyen = kmUsed > 0 ? round2(weightedKm / kmUsed) : 1.0;

  if (lifetimeKm <= 0) {
    return {
      kmUsed,
      kmMaxAdjusted: 0,
      kmLeft: 0,
      wearPercent: 0,
      statusLabel: statusLabel(0),
      coeffTerrainMoyen,
    };
  }

  const kmMaxAdjusted = Math.round(
    lifetimeKm / (POSITION_COEFF[position] * coeffTerrainMoyen),
  );
  const wearPercent = clamp(0, 100, Math.round((kmUsed / kmMaxAdjusted) * 100));
  const kmLeft = Math.max(0, Math.round(kmMaxAdjusted - kmUsed));

  return {
    kmUsed,
    kmMaxAdjusted,
    kmLeft,
    wearPercent,
    statusLabel: statusLabel(wearPercent),
    coeffTerrainMoyen,
  };
}

function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
