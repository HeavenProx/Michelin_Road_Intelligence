import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('bikes')
@Unique(['userId', 'stravaGearId'])
export class Bike {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: number;

  /** gear_id Strava du vélo. */
  @Column({ name: 'strava_gear_id' })
  stravaGearId!: string;

  @Column()
  name!: string;

  /** ROAD / GRAVEL / MTB… */
  @Column({ default: 'ROAD' })
  type!: string;

  /** Distance totale Strava (référence). */
  @Column({ name: 'strava_distance_km', type: 'real', default: 0 })
  stravaDistanceKm!: number;

  /** Epoch ms du dernier import Strava. */
  @Column({ name: 'last_synced_at', type: 'integer', default: 0 })
  lastSyncedAt!: number;
}
