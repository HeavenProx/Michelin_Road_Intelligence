import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TyreModel } from './tyre-model.entity';

@Entity('tyre_sizes')
export class TyreSize {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => TyreModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model!: TyreModel;

  @Column({ name: 'global_id' })
  globalId!: string;

  @Column({ nullable: true, type: 'text' })
  designation!: string | null;

  @Column({ name: 'width_mm', nullable: true, type: 'integer' })
  widthMm!: number | null;

  @Column({ name: 'diameter_etrto', nullable: true, type: 'integer' })
  diameterEtrto!: number | null;

  @Column({ name: 'diameter_inch', nullable: true, type: 'real' })
  diameterInch!: number | null;

  @Column({ name: 'weight_g', nullable: true, type: 'integer' })
  weightG!: number | null;

  @Column({ nullable: true, type: 'text' })
  tpi!: string | null;

  @Column({ name: 'min_pressure_bar', nullable: true, type: 'real' })
  minPressureBar!: number | null;

  @Column({ name: 'max_pressure_bar', nullable: true, type: 'real' })
  maxPressureBar!: number | null;

  @Column({ name: 'ean_code', nullable: true, type: 'text' })
  eanCode!: string | null;
}
