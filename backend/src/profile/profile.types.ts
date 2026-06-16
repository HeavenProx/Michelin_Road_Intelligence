/** Exposition à la pluie, sous-objet du contrat d'API. */
export interface WeatherExposure {
  rain_percentage: number;
  rainy_rides: number;
}

/**
 * Profil cycliste produit par le profiler.
 * Shape exacte attendue par le front (clé `profile` du contrat d'API, cf. CLAUDE.md).
 */
export interface RiderProfile {
  ride_count: number;
  total_distance_km: number;
  monthly_distance: number;
  avg_speed_kmh: number;
  avg_elevation_m: number;
  terrain_label: string;
  style_label: string;
  weather_exposure: WeatherExposure;
  region: string;
}
