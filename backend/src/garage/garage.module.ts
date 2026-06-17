import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProfileModule } from '../profile/profile.module';
import { StravaModule } from '../strava/strava.module';
import { TyreModel } from '../tyres/tyre-model.entity';
import { Bike } from './bike.entity';
import { GarageTyre } from './garage-tyre.entity';
import { GarageController } from './garage.controller';
import { GarageService } from './garage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bike, GarageTyre, TyreModel]),
    StravaModule,
    ProfileModule,
    AuthModule,
  ],
  controllers: [GarageController],
  providers: [GarageService],
  exports: [GarageService],
})
export class GarageModule {}
