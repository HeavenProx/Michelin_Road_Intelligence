import type { RiderProfile } from '../profile/profile.types';

export interface AthleteDto {
  id: number;
  firstname: string;
  lastname: string;
  city: string | null;
  country: string | null;
  profile: string;
}

export interface RecoScores {
  wet_grip: number;
  rolling_resistance: number;
  durability: number;
  terrain_versatility: number;
}

export interface RecoResponse {
  success: boolean;
  athlete: AthleteDto;
  profile: RiderProfile;
  explanation: string;
  recommended: {
    name: string;
    match_score: number;
    description: string;
    lifetime_km: number;
    price_range: string;
    scores: RecoScores;
  };
  alternatives: Array<{
    name: string;
    match_score: number;
    description: string;
  }>;
}
