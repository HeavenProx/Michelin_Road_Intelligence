import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '../avis/review.entity';
import { AuthModule } from '../auth/auth.module';
import { GarageModule } from '../garage/garage.module';
import { NotificationModule } from '../notification/notification.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { ReviewReminder } from './review-reminder.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReviewReminder, Review]),
    GarageModule,
    NotificationModule,
    AuthModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
