import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Cache du profil calculé : une ligne par utilisateur (relation 1-1).
 * `profile` stocke le RiderProfile sérialisé ; `computedAt` sert au TTL.
 */
@Entity('profile_snapshots')
export class ProfileSnapshot {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ unique: true })
  userId!: number;

  /** RiderProfile sérialisé en JSON. */
  @Column('text')
  profile!: string;

  /** Timestamp epoch (ms) du dernier calcul, pour évaluer le TTL. */
  @Column('integer')
  computedAt!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
