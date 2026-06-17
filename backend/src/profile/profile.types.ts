/**
 * Exposition à la pluie, sous-objet du contrat d'API.
 * `null` signale une donnée météo indisponible (aucun ride géolocalisé ou
 * archive Open-Meteo injoignable), à distinguer d'un vrai 0 % (rides exploités,
 * aucun pluvieux).
 */
export interface WeatherExposure {
  rain_percentage: number | null;
  rainy_rides: number | null;
}

/**
 * Profil cycliste produit par le profiler.
 * Shape exacte attendue par le front (clé `profile` du contrat d'API, cf. CLAUDE.md).
 */
export interface RiderProfile {
  ride_count: number;
  total_distance_km: number;
  monthly_distance: number;
  monthly_elevation_m: number;
  avg_speed_kmh: number;
  avg_elevation_m: number;
  terrain_label: string;
  style_label: string;
  weather_exposure: WeatherExposure;
  region: string;
}
