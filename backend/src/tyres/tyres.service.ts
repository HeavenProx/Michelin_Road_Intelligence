import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TyreModel } from './tyre-model.entity';
import { TYRE_SEED } from './tyre.seed';

export interface TyreModelDto {
  globalId: string;
  name: string;
  segment: string;
  useType: string;
  lifetimeKm: number;
  priceRange: string;
  scores: {
    wetGrip: number;
    rollingResistance: number;
    durability: number;
    terrainVersatility: number;
  };
}

@Injectable()
export class TyresService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(TyreModel)
    private readonly repo: Repository<TyreModel>,
  ) {}

  /** Peuple la table si elle est vide (premier démarrage). */
  async onApplicationBootstrap() {
    const count = await this.repo.count();
    if (count === 0) {
      for (const data of TYRE_SEED) {
        await this.repo.save(this.repo.create(data));
      }
    }
  }

  /**
   * Liste les modèles compatibles avec le type de vélo.
   * bikeType : ROAD | GRAVEL | MTB | E-BIKE (E-BIKE → modèles ROAD)
   */
  async listModels(bikeType?: string): Promise<TyreModelDto[]> {
    let models: TyreModel[];

    if (bikeType === 'GRAVEL') {
      models = await this.repo.find({
        where: { cycleTypeWeb: 'GRAVEL' },
        order: { modelName: 'ASC' },
      });
    } else if (bikeType === 'MTB') {
      models = await this.repo.find({
        where: { cycleTypeWeb: 'MTB' },
        order: { modelName: 'ASC' },
      });
    } else {
      models = await this.repo.find({
        where: { cycleTypeWeb: 'ROAD' },
        order: { modelName: 'ASC' },
      });
    }

    return models.map((m) => this.toDto(m));
  }

  private toDto(m: TyreModel): TyreModelDto {
    return {
      globalId: m.globalId,
      name: m.modelName,
      segment: m.segment,
      useType: m.useType ?? '',
      lifetimeKm: m.lifetimeKm,
      priceRange: m.priceRange ?? '',
      scores: {
        wetGrip: m.scoreWetGrip,
        rollingResistance: m.scoreRollingResistance,
        durability: m.scoreDurability,
        terrainVersatility: m.scoreTerrainVersatility,
      },
    };
  }
}
