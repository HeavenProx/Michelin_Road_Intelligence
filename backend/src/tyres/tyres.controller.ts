import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TyreModel } from './tyre-model.entity';

@Controller('api/tyres')
export class TyresController {
  constructor(
    @InjectRepository(TyreModel)
    private readonly tyreRepo: Repository<TyreModel>,
  ) {}

  @Get()
  async list() {
    const models = await this.tyreRepo.find({
      select: ['modelName', 'cycleTypeWeb', 'segment', 'lifetimeKm'],
      order: { modelName: 'ASC' },
    });

    return models.map((m) => ({
      name: m.modelName,
      category: m.cycleTypeWeb ?? m.segment,
      km_max: m.lifetimeKm,
    }));
  }
}
