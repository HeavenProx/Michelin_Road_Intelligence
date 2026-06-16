import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import type { SessionUser } from '../auth/auth.types';
import type { CyclingActivity, StravaSummaryActivityRaw } from './strava.types';

const STRAVA_ACTIVITIES_URL =
  'https://www.strava.com/api/v3/athlete/activities';

/** Types d'activités Strava considérés comme du vélo. */
const CYCLING_SPORT_TYPES = new Set([
  'Ride',
  'GravelRide',
  'MountainBikeRide',
  'EBikeRide',
  'EMountainBikeRide',
  'VirtualRide',
  'Velomobile',
  'Handcycle',
]);

/** Maximum autorisé par Strava pour per_page. */
const MAX_PER_PAGE = 200;
/** Garde-fou anti rate-limit : on ne parcourt jamais plus de pages que ça. */
const MAX_PAGES = 10;

export interface GetActivitiesOptions {
  /** Fenêtre temporelle : activités des N derniers jours (défaut 365). */
  sinceDays?: number;
  /** Plafond du nombre d'activités vélo renvoyées (défaut 400). */
  maxActivities?: number;
}

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Récupère les activités VÉLO de l'athlète connecté, normalisées (km, km/h).
   * Gère la pagination et rafraîchit le token si nécessaire.
   */
  async getCyclingActivities(
    user: SessionUser,
    options: GetActivitiesOptions = {},
  ): Promise<CyclingActivity[]> {
    const { sinceDays = 365, maxActivities = 400 } = options;
    const token = await this.authService.getValidAccessToken(user);
    const after = Math.floor(Date.now() / 1000) - sinceDays * 86_400;

    const cycling: CyclingActivity[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const batch = await this.fetchPage(token, after, page);
      if (batch.length === 0) break;

      for (const raw of batch) {
        if (this.isCycling(raw)) {
          cycling.push(this.normalize(raw));
        }
      }

      if (cycling.length >= maxActivities) break;
      // Dernière page atteinte (lot incomplet).
      if (batch.length < MAX_PER_PAGE) break;
    }

    this.logger.debug(
      `Athlète ${user.athlete.id} : ${cycling.length} activités vélo récupérées (fenêtre ${sinceDays} j).`,
    );
    return cycling.slice(0, maxActivities);
  }

  /** Récupère une page d'activités brutes. */
  private async fetchPage(
    token: string,
    after: number,
    page: number,
  ): Promise<StravaSummaryActivityRaw[]> {
    const params = new URLSearchParams({
      after: String(after),
      page: String(page),
      per_page: String(MAX_PER_PAGE),
    });

    const res = await fetch(`${STRAVA_ACTIVITIES_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 429) {
      this.logger.warn('Rate limit Strava atteint (429).');
      throw new HttpException(
        'Limite de requêtes Strava atteinte, réessayez dans quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(
        `GET /athlete/activities a échoué (${res.status}): ${detail}`,
      );
      throw new HttpException(
        `Échec de la récupération des activités Strava (HTTP ${res.status}).`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return (await res.json()) as StravaSummaryActivityRaw[];
  }

  private isCycling(raw: StravaSummaryActivityRaw): boolean {
    return CYCLING_SPORT_TYPES.has(raw.sport_type ?? raw.type ?? '');
  }

  private normalize(raw: StravaSummaryActivityRaw): CyclingActivity {
    const latlng =
      Array.isArray(raw.start_latlng) && raw.start_latlng.length === 2
        ? raw.start_latlng
        : null;

    return {
      id: raw.id,
      name: raw.name,
      sportType: raw.sport_type ?? raw.type ?? 'Ride',
      distanceKm: round1((raw.distance ?? 0) / 1000),
      movingTimeS: raw.moving_time ?? 0,
      elapsedTimeS: raw.elapsed_time ?? 0,
      totalElevationGainM: Math.round(raw.total_elevation_gain ?? 0),
      elevHighM: raw.elev_high != null ? Math.round(raw.elev_high) : null,
      elevLowM: raw.elev_low != null ? Math.round(raw.elev_low) : null,
      averageSpeedKmh: round1((raw.average_speed ?? 0) * 3.6),
      maxSpeedKmh: round1((raw.max_speed ?? 0) * 3.6),
      averageWatts: raw.average_watts ?? null,
      deviceWatts: raw.device_watts ?? false,
      startDate: raw.start_date,
      startDateLocal: raw.start_date_local,
      startLatlng: latlng,
      trainer: raw.trainer ?? false,
      commute: raw.commute ?? false,
      manual: raw.manual ?? false,
      gearId: raw.gear_id ?? null,
    };
  }
}

/** Arrondi à une décimale. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
