import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileService } from '../profile/profile.service';
import { StravaService } from '../strava/strava.service';
import type { User } from '../users/user.entity';
import type { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './review.entity';

/** Avis au format attendu par le frontend (frontend/src/pages/AvisPage.tsx). */
export interface ReviewDto {
  id: number;
  name: string;
  location: string;
  tire: string;
  km: number;
  totalKm: number;
  rating: number;
  text: string;
  date: string;
  criteria: {
    grip: number;
    durabilite: number;
    confort: number;
    anticrv: number;
  };
}

const FR_DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function displayName(firstname: string, lastname: string): string {
  const initial = lastname?.charAt(0) ?? '';
  return initial ? `${firstname} ${initial}.` : firstname;
}

function toReviewDto(r: Review): ReviewDto {
  const name = r.user
    ? displayName(r.user.firstname, r.user.lastname)
    : r.authorName;
  const location = r.user
    ? [r.user.city, r.user.state].filter(Boolean).join(', ')
    : r.authorLocation;
  return {
    id: r.id,
    name,
    location,
    tire: r.tyreName,
    km: r.kmAtReview,
    totalKm: r.totalKm,
    rating: r.rating,
    text: r.comment,
    date: r.createdAt ? FR_DATE.format(new Date(r.createdAt)) : '',
    criteria: {
      grip: r.gripScore,
      durabilite: r.durabilityScore,
      confort: r.comfortScore,
      anticrv: r.punctureScore,
    },
  };
}

@Injectable()
export class AvisService {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly strava: StravaService,
    private readonly profile: ProfileService,
  ) {}

  /** Liste les avis, optionnellement filtrés par nom de modèle. */
  async listReviews(tire?: string): Promise<ReviewDto[]> {
    const where = tire && tire !== 'Tous' ? { tyreName: tire } : {};
    const rows = await this.reviews.find({
      where,
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map(toReviewDto);
  }

  /** Crée ou met à jour (upsert) l'avis de l'utilisateur sur ce modèle. */
  async createReview(user: User, dto: CreateReviewDto): Promise<ReviewDto> {
    const mountDate = this.resolveMountDate(user.id, dto.tire);
    const kmAtReview = await this.strava.kmRiddenSince(user, mountDate);
    const riderProfile = await this.profile.getProfile(user);
    const totalKm = Math.round(riderProfile.total_distance_km);

    const existing = await this.reviews.findOne({
      where: { userId: user.id, tyreName: dto.tire },
    });
    const review = existing ?? this.reviews.create();

    review.userId = user.id;
    review.tyreName = dto.tire;
    review.authorName = displayName(user.firstname, user.lastname);
    review.authorLocation = [user.city, user.state].filter(Boolean).join(', ');
    review.rating = dto.rating;
    review.gripScore = dto.grip;
    review.durabilityScore = dto.durabilite;
    review.comfortScore = dto.confort;
    review.punctureScore = dto.anticrv;
    review.comment = dto.comment;
    review.mountDate = mountDate;
    review.kmAtReview = kmAtReview;
    review.totalKm = totalKm;

    const saved = await this.reviews.save(review);
    saved.user = user;
    return toReviewDto(saved);
  }

  /**
   * Date de pose du pneu pour ce couple (user, modèle).
   * STUB : renvoie aujourd'hui − 90 jours.
   * TODO: lire la date de pose persistée (garage) quand le Tyre Score back existera.
   * C'est le SEUL endroit à changer pour brancher le garage.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private resolveMountDate(_userId: number, _tyreName: string): Date {
    return new Date(Date.now() - 90 * 86_400_000);
  }
}
