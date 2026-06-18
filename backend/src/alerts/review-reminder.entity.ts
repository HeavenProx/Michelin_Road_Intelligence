import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Trace les rappels avis envoyés par (utilisateur, pneu, palier km).
 * Un enregistrement = une notification email déjà expédiée.
 */
@Entity('review_reminders')
export class ReviewReminder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  /** ID du pneu monté au moment du franchissement. */
  @Column({ name: 'tyre_id' })
  tyreId!: number;

  /** Nom du modèle, pour l'affichage sans jointure. */
  @Column({ name: 'tyre_name', type: 'text' })
  tyreName!: string;

  /** Palier kilométrique franchi (500, 1000, 2000, 3500…). */
  @Column()
  milestone!: number;

  /** Date d'envoi de l'email (ISO yyyy-mm-dd). Null = pas encore envoyé. */
  @Column({ name: 'sent_at', type: 'text', nullable: true })
  sentAt!: string | null;

  /** True dès que l'utilisateur a déposé un avis pour ce pneu. */
  @Column({ default: false })
  done!: boolean;
}
