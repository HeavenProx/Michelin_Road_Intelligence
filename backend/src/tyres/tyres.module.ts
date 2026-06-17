import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TyreModel } from './tyre-model.entity';
import { TyresController } from './tyres.controller';
import { TyresService } from './tyres.service';

@Module({
  imports: [TypeOrmModule.forFeature([TyreModel])],
  controllers: [TyresController],
  providers: [TyresService],
  exports: [TyresService],
})
export class TyresModule {}
