import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GarageService } from '../garage/garage.service';
import { NotificationService } from '../notification/notification.service';
import { Review } from '../avis/review.entity';
import type { User } from '../users/user.entity';
import { ReviewReminder } from './review-reminder.entity';

/** Paliers kilométriques déclenchant un rappel avis. */
const MILESTONES = [500, 1_000, 2_000, 3_500];

const FR_DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export interface AlertDto {
  tire: string;
  wear: number;
  date: string;
}

export interface ReminderDto {
  tire: string;
  threshold: number;
  date: string;
  done: boolean;
}

export interface AlertsResponse {
  alerts: AlertDto[];
  reminders: ReminderDto[];
}

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(ReviewReminder)
    private readonly reminderRepo: Repository<ReviewReminder>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    private readonly garageService: GarageService,
    private readonly notificationService: NotificationService,
  ) {}

  async getAlerts(user: User): Promise<AlertsResponse> {
    const garageData = await this.garageService.getGarage(user);
    const today = FR_DATE.format(new Date());

    // ── Alertes d'usure (pneus ≥ 80 %) ────────────────────────────────────
    const alerts: AlertDto[] = garageData.bikes.flatMap((bike) =>
      bike.tyres
        .filter((t) => t.wear_percent >= 80)
        .map((t) => ({
          tire: t.model.name,
          wear: t.wear_percent,
          date: today,
        })),
    );

    // ── Rappels avis par palier km ─────────────────────────────────────────
    const reminders: ReminderDto[] = [];

    for (const bike of garageData.bikes) {
      for (const tyre of bike.tyres) {
        const crossed = MILESTONES.filter((m) => m <= tyre.km_used);
        if (crossed.length === 0) continue;

        // Avis existant pour ce pneu (un seul par user+modèle, upsert)
        const hasReview = await this.reviewRepo.existsBy({
          userId: user.id,
          tyreName: tyre.model.name,
        });

        for (const milestone of crossed) {
          let reminder = await this.reminderRepo.findOne({
            where: { userId: user.id, tyreId: tyre.id, milestone },
          });

          if (!reminder) {
            reminder = this.reminderRepo.create({
              userId: user.id,
              tyreId: tyre.id,
              tyreName: tyre.model.name,
              milestone,
              sentAt: null,
              done: false,
            });
          }

          // Envoyer l'email une seule fois par palier
          if (!reminder.sentAt) {
            const sent = await this.notificationService.sendReviewReminder(
              tyre.model.name,
              milestone,
            );
            if (sent) {
              reminder.sentAt = new Date().toISOString().slice(0, 10);
            }
          }

          // Synchroniser le champ done avec la présence d'un avis réel
          reminder.done = hasReview;
          await this.reminderRepo.save(reminder);

          reminders.push({
            tire: tyre.model.name,
            threshold: milestone,
            date: reminder.sentAt
              ? FR_DATE.format(new Date(reminder.sentAt))
              : today,
            done: reminder.done,
          });
        }
      }
    }

    // Plus récents (palier le plus élevé) en premier
    reminders.sort((a, b) => b.threshold - a.threshold);

    return { alerts, reminders };
  }
}
