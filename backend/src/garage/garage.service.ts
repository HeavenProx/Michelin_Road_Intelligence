import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileService } from '../profile/profile.service';
import { StravaService } from '../strava/strava.service';
import { TyreModel } from '../tyres/tyre-model.entity';
import type { User } from '../users/user.entity';
import { Bike } from './bike.entity';
import { GarageTyre } from './garage-tyre.entity';
import type { CyclingActivity } from '../strava/strava.types';
import type { RiderProfile } from '../profile/profile.types';
import { computeTyreScore, type TyreScore } from './garage.wear';
import type { TyrePosition } from './garage-tyre.entity';
import type { SetTyreDto } from './dto/set-tyre.dto';
import { ReplaceTyreDto } from './dto/replace-tyre.dto';

export interface TyreDto {
  id: number;
  position: TyrePosition;
  model: { name: string; lifetime_km: number; price_range: string };
  mounted_date: string;
  km_used: number;
  km_max_adjusted: number;
  km_left: number;
  wear_percent: number;
  status_label: string;
  explanation: string;
}
export interface BikeDto {
  id: number;
  name: string;
  type: string;
  strava_distance_km: number;
  tyres: TyreDto[];
}
export interface GarageResponse {
  success: true;
  bikes: BikeDto[];
}

@Injectable()
export class GarageService {
  constructor(
    @InjectRepository(Bike)
    private readonly bikeRepo: Repository<Bike>,
    @InjectRepository(GarageTyre)
    private readonly tyreRepo: Repository<GarageTyre>,
    @InjectRepository(TyreModel)
    private readonly modelRepo: Repository<TyreModel>,
    private readonly strava: StravaService,
    private readonly profile: ProfileService,
  ) {}

  /** Importe / met à jour les vélos Strava de l'utilisateur. */
  async syncBikes(user: User): Promise<Bike[]> {
    const stravaBikes = await this.strava.getAthleteBikes(user);
    const existing = await this.bikeRepo.find({ where: { userId: user.id } });
    const byGearId = new Map(existing.map((b) => [b.stravaGearId, b]));
    const now = Date.now();

    const result: Bike[] = [];
    for (const sb of stravaBikes) {
      const bike =
        byGearId.get(sb.gearId) ??
        this.bikeRepo.create({ userId: user.id, stravaGearId: sb.gearId });
      bike.name = sb.name;
      bike.stravaDistanceKm = sb.distanceKm;
      bike.lastSyncedAt = now;
      result.push(await this.bikeRepo.save(bike));
    }
    return result;
  }

  /** Garage complet : vélos + pneus montés + Tyre Scores. */
  async getGarage(user: User): Promise<GarageResponse> {
    const bikes = await this.syncBikes(user);
    const [activities, profile] = await Promise.all([
      this.strava.getCyclingActivities(user, {
        sinceDays: 365,
        maxActivities: 1000,
      }),
      this.profile.getProfile(user),
    ]);
    const now = new Date();

    const bikeDtos: BikeDto[] = [];
    for (const bike of bikes) {
      const tyres = await this.tyreRepo.find({
        where: { bikeId: bike.id, status: 'MOUNTED' },
      });
      const bikeActivities = activities.filter(
        (a) => a.gearId === bike.stravaGearId,
      );
      bikeDtos.push({
        id: bike.id,
        name: bike.name,
        type: bike.type,
        strava_distance_km: bike.stravaDistanceKm,
        tyres: tyres.map((t) =>
          this.toTyreDto(t, bikeActivities, profile, now),
        ),
      });
    }
    return { success: true, bikes: bikeDtos };
  }

  /** Historique des pneus retirés, groupé par vélo. */
  async getHistory(user: User) {
    const bikes = await this.bikeRepo.find({ where: { userId: user.id } });
    const result: Array<{
      id: number;
      name: string;
      retired: Array<{
        model: string;
        km_held: number | null;
        duration_months: number | null;
        final_wear_percent: number | null;
        mounted_date: string;
        removed_date: string | null;
      }>;
    }> = [];
    for (const bike of bikes) {
      const retired = await this.tyreRepo.find({
        where: { bikeId: bike.id, status: 'RETIRED' },
      });
      result.push({
        id: bike.id,
        name: bike.name,
        retired: retired.map((t) => ({
          model: t.tyreModel.modelName,
          km_held: t.kmHeld,
          duration_months: t.durationMonths,
          final_wear_percent: t.finalWearPercent,
          mounted_date: t.mountedDate,
          removed_date: t.removedDate,
        })),
      });
    }
    return { success: true as const, bikes: result };
  }

  private toTyreDto(
    tyre: GarageTyre,
    activities: CyclingActivity[],
    profile: RiderProfile,
    now: Date,
  ): TyreDto {
    const score = computeTyreScore(
      activities,
      tyre.position,
      tyre.tyreModel.lifetimeKm,
      tyre.mountedDate,
      now,
    );
    return {
      id: tyre.id,
      position: tyre.position,
      model: {
        name: tyre.tyreModel.modelName,
        lifetime_km: tyre.tyreModel.lifetimeKm,
        price_range: tyre.tyreModel.priceRange ?? 'N/C',
      },
      mounted_date: tyre.mountedDate,
      km_used: score.kmUsed,
      km_max_adjusted: score.kmMaxAdjusted,
      km_left: score.kmLeft,
      wear_percent: score.wearPercent,
      status_label: score.statusLabel,
      explanation: this.buildExplanation(tyre.position, score, profile),
    };
  }

  /** Texte pédagogique : position + terrain (chiffré) + météo/style (habillage). */
  private buildExplanation(
    position: TyrePosition,
    score: TyreScore,
    profile: RiderProfile,
  ): string {
    const place = position === 'REAR' ? 'arrière' : 'avant';
    const parts = [
      `Pneu ${place} : l'usure tient compte de la charge et de votre terrain.`,
    ];
    if (score.coeffTerrainMoyen > 1.1) {
      parts.push('Vos sorties hors-asphalte accélèrent l’abrasion.');
    }
    const rain = Math.round(profile.weather_exposure.rain_percentage);
    if (rain >= 20) {
      parts.push(
        `Avec ${rain}% de sorties sous la pluie, surveillez l'accroche sur la fin de vie.`,
      );
    }
    if (profile.style_label) {
      parts.push(
        `Votre style ${profile.style_label.toLowerCase()} est pris en compte dans nos conseils d'entretien.`,
      );
    }
    return parts.join(' ');
  }

  /** Assigne ou met à jour le pneu monté à (vélo, position). */
  async setTyre(user: User, dto: SetTyreDto): Promise<GarageTyre> {
    const bike = await this.bikeRepo.findOne({
      where: { id: dto.bikeId, userId: user.id },
    });
    if (!bike) throw new NotFoundException('Vélo introuvable.');

    const model = await this.modelRepo.findOne({
      where: { globalId: dto.modelGlobalId },
    });
    if (!model) throw new NotFoundException('Modèle de pneu introuvable.');

    const existing = await this.tyreRepo.findOne({
      where: { bikeId: bike.id, position: dto.position, status: 'MOUNTED' },
    });

    const tyre =
      existing ??
      this.tyreRepo.create({
        bikeId: bike.id,
        position: dto.position,
        status: 'MOUNTED',
      });
    tyre.tyreModelId = model.id;
    tyre.mountedDate = dto.mountedDate;
    return this.tyreRepo.save(tyre);
  }

  /** Archive le pneu monté `tyreId` et monte un nouveau pneu à sa place. */
  async replaceTyre(
    user: User,
    tyreId: number,
    dto: ReplaceTyreDto,
  ): Promise<GarageTyre> {
    const old = await this.tyreRepo.findOne({
      where: { id: tyreId, status: 'MOUNTED' },
      relations: { bike: true },
    });
    if (!old || old.bike.userId !== user.id) {
      throw new NotFoundException('Pneu monté introuvable.');
    }

    const model = await this.modelRepo.findOne({
      where: { globalId: dto.modelGlobalId },
    });
    if (!model) throw new NotFoundException('Modèle de pneu introuvable.');

    const now = new Date();
    const activities = await this.strava.getCyclingActivities(user, {
      sinceDays: 1000,
      maxActivities: 1000,
    });
    const bikeActivities = activities.filter(
      (a) => a.gearId === old.bike.stravaGearId,
    );
    const score = computeTyreScore(
      bikeActivities,
      old.position,
      old.tyreModel.lifetimeKm,
      old.mountedDate,
      now,
    );

    const removedDate = now.toISOString().slice(0, 10);
    old.status = 'RETIRED';
    old.removedDate = removedDate;
    old.kmHeld = score.kmUsed;
    old.finalWearPercent = score.wearPercent;
    old.durationMonths = this.monthsBetween(old.mountedDate, removedDate);
    await this.tyreRepo.save(old);

    const fresh = this.tyreRepo.create({
      bikeId: old.bikeId,
      position: old.position,
      status: 'MOUNTED',
      tyreModelId: model.id,
      mountedDate: dto.mountedDate,
    });
    return this.tyreRepo.save(fresh);
  }

  /** Nombre de mois entiers entre deux dates ISO. */
  private monthsBetween(fromIso: string, toIso: string): number {
    const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
    return Math.max(0, Math.round(ms / (30.44 * 86_400_000)));
  }

  /** Jeu de démonstration (pas d'auth). */
  getDemoGarage(): GarageResponse {
    return {
      success: true,
      bikes: [
        {
          id: 1,
          name: 'Specialized Tarmac',
          type: 'ROAD',
          strava_distance_km: 4200,
          tyres: [
            {
              id: 1,
              position: 'FRONT',
              model: {
                name: 'POWER ROAD',
                lifetime_km: 8000,
                price_range: '45 – 58 €',
              },
              mounted_date: '2025-08-15',
              km_used: 1680,
              km_max_adjusted: 8000,
              km_left: 6320,
              wear_percent: 21,
              status_label: 'Bon état',
              explanation:
                "Pneu avant : l'usure tient compte de la charge et de votre terrain.",
            },
            {
              id: 2,
              position: 'REAR',
              model: {
                name: 'POWER ROAD',
                lifetime_km: 8000,
                price_range: '45 – 58 €',
              },
              mounted_date: '2025-08-15',
              km_used: 1680,
              km_max_adjusted: 4211,
              km_left: 2531,
              wear_percent: 40,
              status_label: 'Bon état',
              explanation:
                "Pneu arrière : l'usure tient compte de la charge et de votre terrain.",
            },
          ],
        },
      ],
    };
  }
}
