/**
 * Types liés aux activités Strava.
 * La liste GET /athlete/activities renvoie des **SummaryActivity** (pas DetailedActivity) :
 * réf. https://developers.strava.com/docs/reference/#api-models-SummaryActivity
 */

/** Activité brute (snake_case) renvoyée par GET /athlete/activities. Sous-ensemble exploité. */
export interface StravaSummaryActivityRaw {
  id: number;
  name: string;
  /** Ex. "Ride", "GravelRide", "MountainBikeRide", "Run"… */
  sport_type: string;
  /** Ancien champ générique, repli si sport_type absent. */
  type?: string;
  /** Distance en mètres. */
  distance: number;
  /** Temps en mouvement (s). */
  moving_time: number;
  /** Temps total écoulé, arrêts inclus (s). */
  elapsed_time: number;
  /** Dénivelé positif (m). */
  total_elevation_gain: number;
  /** Altitude max / min atteinte (m). */
  elev_high?: number;
  elev_low?: number;
  /** Vitesses en m/s. */
  average_speed: number;
  max_speed?: number;
  /** Puissance moyenne (W) — rides avec capteur uniquement. */
  average_watts?: number;
  /** true si les watts viennent d'un capteur de puissance, false si estimés. */
  device_watts?: boolean;
  /** Dates de début (UTC et heure locale, ISO 8601). */
  start_date: string;
  start_date_local: string;
  /** [latitude, longitude] du départ, ou [] si non géolocalisée. */
  start_latlng: [number, number] | [] | null;
  /** Enregistrée sur home-trainer (pas d'usure ni de terrain réels). */
  trainer?: boolean;
  /** Trajet domicile-travail. */
  commute?: boolean;
  /** Saisie manuelle (pas de GPS fiable). */
  manual?: boolean;
  /** Identifiant du matériel (vélo) associé. */
  gear_id?: string | null;
}

/** Activité normalisée (unités exploitables : km, km/h) pour les modules en aval. */
export interface CyclingActivity {
  id: number;
  name: string;
  /** Road / Gravel / VTT… — déterminant pour la famille de pneu. */
  sportType: string;
  distanceKm: number;
  movingTimeS: number;
  elapsedTimeS: number;
  totalElevationGainM: number;
  /** Altitude max / min (m), null si non fourni. */
  elevHighM: number | null;
  elevLowM: number | null;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  /** Puissance moyenne (W), null si pas de capteur. */
  averageWatts: number | null;
  /** true si averageWatts provient d'un capteur (fiable), false si estimé. */
  deviceWatts: boolean;
  /** Date de début (UTC ISO). */
  startDate: string;
  /** Date de début en heure locale (ISO) — saisonnalité / créneau horaire. */
  startDateLocal: string;
  /** [latitude, longitude] du départ, ou null si non géolocalisée. */
  startLatlng: [number, number] | null;
  /** Home-trainer : à exclure de l'usure / du terrain. */
  trainer: boolean;
  /** Trajet domicile-travail. */
  commute: boolean;
  /** Saisie manuelle (données peu fiables). */
  manual: boolean;
  /** Vélo associé (gear_id Strava), null si non renseigné. */
  gearId: string | null;
}

/** Vélo brut renvoyé dans le champ `bikes[]` de GET /athlete (DetailedAthlete). */
export interface StravaBikeRaw {
  id: string;
  name: string;
  /** Distance totale en mètres. */
  distance: number;
  primary?: boolean;
}

/** Vélo normalisé (km) exploité par le garage. */
export interface StravaBike {
  /** gear_id Strava (ex: "b123"). */
  gearId: string;
  name: string;
  distanceKm: number;
  primary: boolean;
}
