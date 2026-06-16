export interface Athlete {
  id: number;
  firstname: string;
  lastname: string;
  city?: string;
  country?: string;
  profile?: string | null;
}

export interface LiveProfile {
  ride_count: number;
  total_distance_km: number;
  monthly_distance: number;
  avg_speed_kmh: number;
  avg_elevation_m: number;
  terrain_label: string;
  style_label: string;
  weather_exposure: { rain_percentage: number; rainy_rides?: number };
  region: string;
}

export interface LiveReco {
  explanation: string;
  recommended: {
    name: string;
    match_score: number;
    description: string;
    lifetime_km: number;
    price_range: string;
    scores: {
      wet_grip: number;
      rolling_resistance: number;
      durability: number;
      terrain_versatility: number;
    };
  };
  alternatives: Array<{ name: string; match_score: number; description?: string }>;
}

export interface LiveData {
  athlete: Athlete;
  profile: LiveProfile;
  reco: LiveReco;
  isDemo?: boolean;
}
