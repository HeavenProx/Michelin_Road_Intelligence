import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TyreModel } from '../tyres/tyre-model.entity';
import { Bike } from './bike.entity';

export type TyrePosition = 'FRONT' | 'REAR';
export type TyreStatus = 'MOUNTED' | 'RETIRED';

@Entity('garage_tyres')
export class GarageTyre {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Bike, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bike_id' })
  bike!: Bike;

  @Column({ name: 'bike_id' })
  bikeId!: number;

  @Column()
  position!: TyrePosition;

  @ManyToOne(() => TyreModel, { eager: true })
  @JoinColumn({ name: 'tyre_model_id' })
  tyreModel!: TyreModel;

  @Column({ name: 'tyre_model_id' })
  tyreModelId!: number;

  /** Date de pose (ISO yyyy-mm-dd). */
  @Column({ name: 'mounted_date', type: 'text' })
  mountedDate!: string;

  @Column({ default: 'MOUNTED' })
  status!: TyreStatus;

  /** Date de retrait (ISO), null si encore monté. */
  @Column({ name: 'removed_date', type: 'text', nullable: true })
  removedDate!: string | null;

  /** km réels tenus, figé à l'archivage. */
  @Column({ name: 'km_held', type: 'real', nullable: true })
  kmHeld!: number | null;

  @Column({ name: 'duration_months', type: 'integer', nullable: true })
  durationMonths!: number | null;

  @Column({ name: 'final_wear_percent', type: 'integer', nullable: true })
  finalWearPercent!: number | null;
}
