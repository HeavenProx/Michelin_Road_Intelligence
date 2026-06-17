import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProfileModule } from '../profile/profile.module';
import { StravaModule } from '../strava/strava.module';
import { AvisController } from './avis.controller';
import { AvisService } from './avis.service';
import { Review } from './review.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),
    StravaModule,
    ProfileModule,
    AuthModule,
  ],
  controllers: [AvisController],
  providers: [AvisService],
})
export class AvisModule {}
