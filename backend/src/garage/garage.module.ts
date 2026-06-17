import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProfileModule } from '../profile/profile.module';
import { StravaModule } from '../strava/strava.module';
import { Bike } from './bike.entity';
import { GarageTyre } from './garage-tyre.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bike, GarageTyre]),
    StravaModule,
    ProfileModule,
    AuthModule,
  ],
})
export class GarageModule {}
