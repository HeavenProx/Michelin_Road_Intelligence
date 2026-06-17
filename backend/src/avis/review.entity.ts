import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Avis utilisateur sur un modèle de pneu (référencé par son nom — le front est name-based).
 * `userId` nullable : null pour les avis démo seedés. À la lecture, si `user` est présent,
 * ses infos priment sur le snapshot `authorName`/`authorLocation`.
 */
@Entity('reviews')
@Index(['userId', 'tyreName'], { unique: true })
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ name: 'user_id', type: 'integer', nullable: true })
  userId!: number | null;

  @Column({ name: 'tyre_name', type: 'text' })
  tyreName!: string;

  /** Snapshot auteur — fallback quand `user` est null (seeds / user supprimé). */
  @Column({ name: 'author_name', type: 'text' })
  authorName!: string;

  @Column({ name: 'author_location', type: 'text' })
  authorLocation!: string;

  @Column({ type: 'integer' })
  rating!: number;

  @Column({ name: 'grip_score', type: 'integer' })
  gripScore!: number;

  @Column({ name: 'durability_score', type: 'integer' })
  durabilityScore!: number;

  @Column({ name: 'comfort_score', type: 'integer' })
  comfortScore!: number;

  @Column({ name: 'puncture_score', type: 'integer' })
  punctureScore!: number;

  @Column({ type: 'text', default: '' })
  comment!: string;

  /** Date de pose résolue (stub aujourd'hui ; garage demain). Non affichée. */
  @Column({ name: 'mount_date', type: 'datetime' })
  mountDate!: Date;

  /** Km parcourus sur le pneu au moment de l'avis. */
  @Column({ name: 'km_at_review', type: 'integer' })
  kmAtReview!: number;

  /** Km total du cycliste. */
  @Column({ name: 'total_km', type: 'integer' })
  totalKm!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
