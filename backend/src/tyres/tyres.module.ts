import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TyreModel } from './tyre-model.entity';
import { TyresController } from './tyres.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TyreModel])],
  controllers: [TyresController],
})
export class TyresModule {}
