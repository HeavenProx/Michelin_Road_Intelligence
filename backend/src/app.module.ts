import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AvisModule } from './avis/avis.module';
import { Review } from './avis/review.entity';
import { Bike } from './garage/bike.entity';
import { GarageTyre } from './garage/garage-tyre.entity';
import { GarageModule } from './garage/garage.module';
import { ProfileModule } from './profile/profile.module';
import { ProfileSnapshot } from './profile/profile-snapshot.entity';
import { AlertsModule } from './alerts/alerts.module';
import { NotificationModule } from './notification/notification.module';
import { PeersModule } from './peers/peers.module';
import { RecommendModule } from './recommend/recommend.module';
import { StravaModule } from './strava/strava.module';
import { TyresModule } from './tyres/tyres.module';
import { TyreModel } from './tyres/tyre-model.entity';
import { TyreSize } from './tyres/tyre-size.entity';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.get<string>('DB_PATH') ?? 'data/michelin.db',
        entities: [
          User,
          TyreModel,
          TyreSize,
          ProfileSnapshot,
          Review,
          Bike,
          GarageTyre,
        ],
        synchronize: true,
      }),
    }),
    UsersModule,
    AuthModule,
    StravaModule,
    ProfileModule,
    RecommendModule,
    NotificationModule,
    AvisModule,
    GarageModule,
    TyresModule,
    AlertsModule,
    PeersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
