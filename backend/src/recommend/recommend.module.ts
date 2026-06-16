import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProfileModule } from '../profile/profile.module';
import { TyreModel } from '../tyres/tyre-model.entity';
import { RecommendController } from './recommend.controller';
import { RecommendService } from './recommend.service';

@Module({
  imports: [AuthModule, ProfileModule, TypeOrmModule.forFeature([TyreModel])],
  providers: [RecommendService],
  controllers: [RecommendController],
})
export class RecommendModule {}
