import { Injectable, Logger } from '@nestjs/common';
import type { CyclingActivity } from '../../strava/strava.types';
import type { WeatherExposure } from '../profile.types';

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
/** Au-dessus de ce cumul (mm) sur la journée, le ride est compté pluvieux. */
const RAIN_THRESHOLD_MM = 1;
/** Échantillon : les N rides géolocalisés les plus récents. */
const SAMPLE_SIZE = 60;
/** Nombre d'appels Open-Meteo lancés en parallèle. */
const CONCURRENCY = 6;

/** Sous-ensemble exploité de la réponse Open-Meteo archive. */
interface ArchiveResponse {
  daily?: {
    time?: string[];
    precipitation_sum?: (number | null)[];
  };
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  /**
   * Estime l'exposition à la pluie sur un échantillon de rides récents
   * via l'API archive d'Open-Meteo. Ne fait jamais échouer l'appelant :
   * les rides sans donnée exploitable sont exclus du dénominateur.
   */
  async getRainExposure(
    activities: CyclingActivity[],
  ): Promise<WeatherExposure> {
    const sample = activities
      .filter((a) => a.startLatlng != null)
      .sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      )
      .slice(0, SAMPLE_SIZE);

    if (sample.length === 0) {
      return { rain_percentage: null, rainy_rides: null };
    }

    const cache = new Map<string, number | null>();
    /** Promesses en cours (évite la double requête pour la même clé dans un batch). */
    const inflight = new Map<string, Promise<number | null>>();
    let rainy = 0;
    let exploitable = 0;

    for (let i = 0; i < sample.length; i += CONCURRENCY) {
      const batch = sample.slice(i, i + CONCURRENCY);
      const precipitations = await Promise.all(
        batch.map((activity) => this.precipForRide(activity, cache, inflight)),
      );
      for (const precip of precipitations) {
        if (precip == null) continue; // donnée absente → hors dénominateur
        exploitable++;
        if (precip > RAIN_THRESHOLD_MM) rainy++;
      }
    }

    if (exploitable === 0) {
      return { rain_percentage: null, rainy_rides: null };
    }
    return {
      rainy_rides: rainy,
      rain_percentage: Math.round((rainy / exploitable) * 100),
    };
  }

  /** Précipitation du jour pour un ride, avec cache (clé ≈ 1 km, même jour).
   *  `inflight` évite la double requête si deux rides partagent la même clé dans un batch. */
  private async precipForRide(
    activity: CyclingActivity,
    cache: Map<string, number | null>,
    inflight: Map<string, Promise<number | null>>,
  ): Promise<number | null> {
    const [lat, lng] = activity.startLatlng!;
    const date = activity.startDateLocal.slice(0, 10); // YYYY-MM-DD
    const key = `${lat.toFixed(2)},${lng.toFixed(2)},${date}`;
    if (cache.has(key)) {
      return cache.get(key) ?? null;
    }
    if (inflight.has(key)) {
      return inflight.get(key)!;
    }
    const promise = this.fetchPrecip(lat, lng, date).then((precip) => {
      cache.set(key, precip);
      inflight.delete(key);
      return precip;
    });
    inflight.set(key, promise);
    return promise;
  }

  /** Un appel Open-Meteo archive pour une coordonnée et un jour. */
  private async fetchPrecip(
    lat: number,
    lng: number,
    date: string,
  ): Promise<number | null> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      start_date: date,
      end_date: date,
      daily: 'precipitation_sum',
      timezone: 'auto',
    });

    try {
      const res = await fetch(`${ARCHIVE_URL}?${params.toString()}`);
      if (!res.ok) {
        this.logger.warn(
          `Open-Meteo archive a répondu ${res.status} pour ${date}.`,
        );
        return null;
      }
      const data = (await res.json()) as ArchiveResponse;
      const value = data.daily?.precipitation_sum?.[0];
      return typeof value === 'number' ? value : null;
    } catch (err) {
      this.logger.warn(
        `Open-Meteo archive injoignable pour ${date}: ${String(err)}`,
      );
      return null;
    }
  }
}
