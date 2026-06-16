import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StravaController } from './strava.controller';
import { StravaService } from './strava.service';

@Module({
  imports: [AuthModule], // pour AuthService.getValidAccessToken
  controllers: [StravaController],
  providers: [StravaService],
  // Exporté : profiler/recommender (à venir) consommeront ce service.
  exports: [StravaService],
})
export class StravaModule {}
