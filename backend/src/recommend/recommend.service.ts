import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileService } from '../profile/profile.service';
import type { RiderProfile } from '../profile/profile.types';
import { TyreModel } from '../tyres/tyre-model.entity';
import type { User } from '../users/user.entity';
import type { RecoResponse } from './recommend.types';

const DEMO_RECO: RecoResponse = {
  success: true,
  athlete: {
    id: 12345678,
    firstname: 'Thomas',
    lastname: 'Dubois',
    city: 'Paris',
    country: 'France',
    profile: '',
  },
  profile: {
    ride_count: 48,
    total_distance_km: 2340,
    monthly_distance: 195,
    monthly_elevation_m: 4200,
    avg_speed_kmh: 27.4,
    avg_elevation_m: 312,
    terrain_label: 'Mixte',
    style_label: 'Endurance',
    weather_exposure: { rain_percentage: 28, rainy_rides: 13 },
    region: 'Paris, Île-de-France, France',
  },
  explanation:
    'Avec 28% de vos sorties sous la pluie et un profil mixte, le Power Road est votre allié idéal. Profitez de son excellente accroche par temps mouillé et de sa durabilité supérieure.',
  recommended: {
    name: 'POWER ROAD',
    match_score: 87,
    description: 'Endurance — all road',
    features: [
      'Faible résistance au roulement',
      'Durabilité éprouvée sur asphalte',
      'Profil équilibré performance / confort',
    ],
    lifetime_km: 8000,
    price_range: '45 – 58 €',
    scores: {
      wet_grip: 4,
      rolling_resistance: 4,
      durability: 4,
      terrain_versatility: 3,
    },
  },
  alternatives: [
    {
      name: 'POWER ALL SEASON 4S',
      match_score: 82,
      description: 'Endurance — all weather',
    },
    {
      name: 'POWER COMPETITION',
      match_score: 74,
      description: 'Racing — high performance',
    },
    {
      name: 'POWER ENDURANCE 2',
      match_score: 71,
      description: 'Endurance — long distance',
    },
  ],
};

@Injectable()
export class RecommendService {
  constructor(
    @InjectRepository(TyreModel)
    private readonly tyreRepo: Repository<TyreModel>,
    private readonly profileService: ProfileService,
  ) {}

  async getRecommendation(user: User): Promise<RecoResponse> {
    const profile = await this.profileService.getProfile(user);
    const models = await this.queryModels(profile.style_label);

    if (models.length === 0) {
      return {
        ...DEMO_RECO,
        athlete: this.athleteFromUser(user),
        profile,
      };
    }

    const weights = this.computeWeights(profile);
    const ranked = this.rankModels(models, weights);
    const [best, ...rest] = ranked;

    return {
      success: true,
      athlete: this.athleteFromUser(user),
      profile,
      explanation: this.generateExplanation(profile, best.model),
      recommended: {
        name: best.model.modelName,
        match_score: best.score,
        description: this.generateDescription(best.model),
        features: this.generateFeatures(best.model),
        lifetime_km: best.model.lifetimeKm,
        price_range: best.model.priceRange ?? 'N/C',
        scores: {
          wet_grip: best.model.scoreWetGrip,
          rolling_resistance: best.model.scoreRollingResistance,
          durability: best.model.scoreDurability,
          terrain_versatility: best.model.scoreTerrainVersatility,
        },
      },
      alternatives: rest.slice(0, 3).map(({ model, score }) => ({
        name: model.modelName,
        match_score: score,
        description: this.generateDescription(model),
      })),
    };
  }

  getDemoRecommendation(): RecoResponse {
    return DEMO_RECO;
  }

  private athleteFromUser(user: User) {
    return {
      id: user.stravaId,
      firstname: user.firstname,
      lastname: user.lastname,
      city: user.city,
      country: user.country,
      profile: user.profile,
    };
  }

  /** Filtre les modèles par discipline, avec fallback sur tout le catalogue. */
  private async queryModels(styleLabel: string): Promise<TyreModel[]> {
    const qb = this.tyreRepo.createQueryBuilder('m');

    if (styleLabel === 'VTT') {
      qb.where('m.cycleType LIKE :v', { v: '%MTB%' });
    } else if (styleLabel === 'Gravel') {
      qb.where('m.cycleTypeWeb LIKE :v', { v: '%GRAVEL%' });
    } else {
      qb.where('m.cycleType LIKE :road OR m.cycleType LIKE :route', {
        road: '%ROAD%',
        route: '%ROUTE%',
      });
    }

    const filtered = await qb.getMany();
    if (filtered.length >= 3) return filtered;

    return this.tyreRepo.find();
  }

  /** Poids dynamiques : chaque dimension est pondérée selon le profil du cycliste. */
  private computeWeights(profile: RiderProfile): Record<string, number> {
    const rain = (profile.weather_exposure.rain_percentage ?? 0) / 100;
    const style = profile.style_label;
    const terrain = profile.terrain_label;

    return {
      wet_grip: 0.5 + rain * 1.5,
      rolling_resistance:
        style === 'Performance' ? 2.0 : style === 'Endurance' ? 1.5 : 1.0,
      durability:
        profile.monthly_distance > 300 || style === 'Endurance' ? 2.0 : 1.0,
      terrain_versatility:
        terrain === 'Montagne' ? 2.0 : terrain === 'Mixte' ? 1.5 : 0.5,
    };
  }

  /**
   * Score chaque modèle (0–100), déduplique par modelName,
   * et trie par score décroissant.
   */
  private rankModels(
    models: TyreModel[],
    weights: Record<string, number>,
  ): Array<{ model: TyreModel; score: number }> {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    const scored = models.map((model) => {
      const rawScore =
        (weights.wet_grip * model.scoreWetGrip +
          weights.rolling_resistance * model.scoreRollingResistance +
          weights.durability * model.scoreDurability +
          weights.terrain_versatility * model.scoreTerrainVersatility) /
        totalWeight;
      return { model, score: Math.round(((rawScore - 1) / 4) * 100) };
    });

    // Garder le meilleur score par nom de modèle
    const best = new Map<string, { model: TyreModel; score: number }>();
    for (const item of scored) {
      const existing = best.get(item.model.modelName);
      if (!existing || item.score > existing.score) {
        best.set(item.model.modelName, item);
      }
    }

    return [...best.values()].sort((a, b) => b.score - a.score);
  }

  private generateExplanation(profile: RiderProfile, model: TyreModel): string {
    const rain = Math.round(profile.weather_exposure.rain_percentage ?? 0);
    const terrain =
      profile.terrain_label !== 'Données insuffisantes'
        ? profile.terrain_label.toLowerCase()
        : null;

    let intro =
      rain >= 20
        ? `Avec ${rain}% de vos sorties sous la pluie`
        : 'Avec des conditions généralement sèches';

    if (terrain) intro += ` et un profil ${terrain}`;
    intro += `, le ${model.modelName} est votre allié idéal.`;

    const highlights: string[] = [];
    if (model.scoreWetGrip >= 4)
      highlights.push('son excellente accroche par temps mouillé');
    if (model.scoreRollingResistance >= 4)
      highlights.push('sa faible résistance au roulement');
    if (model.scoreDurability >= 4) highlights.push('sa durabilité supérieure');
    if (model.scoreTerrainVersatility >= 4)
      highlights.push('sa polyvalence terrain');

    const parts = [intro];

    if (highlights.length > 0) {
      const h = highlights.slice(0, 2);
      const hlStr = h.length === 2 ? `${h[0]} et ${h[1]}` : h[0];
      parts.push(`Profitez de ${hlStr}.`);
    }

    if (profile.monthly_distance > 300) {
      parts.push(
        `Sa durabilité s'adapte à votre volume de ${Math.round(profile.monthly_distance)} km/mois.`,
      );
    }

    return parts.join(' ');
  }

  private generateFeatures(model: TyreModel): string[] {
    const features: string[] = [];
    const name = model.modelName.toUpperCase();
    const rubber = (model.rubberTechnologies ?? '').toUpperCase();
    const casing = (model.casingTechnologies ?? '').toUpperCase();
    const tread = (model.treadTechnologies ?? '').toUpperCase();

    if (rubber.includes('GUM-X'))
      features.push('Compound GUM-X haute performance');
    else if (rubber.includes('MAGI-X'))
      features.push('Compound MAGI-X longue durée');

    if (casing.includes('BEAD TO BEAD SHIELD'))
      features.push('Protection Bead to Bead Shield');
    else if (casing.includes('ARAMID SHIELD'))
      features.push('Renfort anti-crevaison Aramid Shield');
    else if (casing.includes('TUBELESS SHIELD'))
      features.push('Bouclier Tubeless Shield');
    else if (casing.includes('HI-DENSITY SHIELD'))
      features.push('Bouclier Hi-Density Shield');

    if (tread.includes('HI-GRIP DESIGN'))
      features.push('Sculpture Hi-Grip Design');
    else if (tread.includes('GRIP DESIGN'))
      features.push('Sculpture Grip Design');

    if (
      model.sealing?.toUpperCase() === 'TUBELESS READY' ||
      name.includes('TLR')
    ) {
      features.push('Montage sans chambre (TLR)');
    }

    if (name.includes('ALL SEASON') || name.includes('4S'))
      features.push('Certification toutes saisons');
    if (name.includes('GRAVEL')) features.push('Polyvalence route et gravel');

    if (features.length < 2) {
      if (model.scoreWetGrip >= 4)
        features.push('Accroche optimale par temps humide');
      if (model.scoreRollingResistance >= 4)
        features.push('Faible résistance au roulement');
      if (model.scoreDurability >= 4) features.push('Durabilité renforcée');
      if (model.scoreTerrainVersatility >= 4)
        features.push('Polyvalence terrain confirmée');
    }

    if (features.length === 0) {
      features.push('Pneu Michelin haute performance');
      features.push(
        `Durée de vie estimée ${model.lifetimeKm.toLocaleString('fr-FR')} km`,
      );
    }

    return features.slice(0, 3);
  }

  private generateDescription(model: TyreModel): string {
    const segment =
      model.segment.charAt(0) + model.segment.slice(1).toLowerCase();
    if (model.useType) {
      return `${segment} — ${model.useType.toLowerCase()}`;
    }
    if (model.terrainTypes) {
      return `${segment} — ${model.terrainTypes.toLowerCase()}`;
    }
    return segment;
  }
}
