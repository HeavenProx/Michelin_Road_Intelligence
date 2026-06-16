import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TyreModel } from './tyre-model.entity';

@Entity('tyre_sizes')
export class TyreSize {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => TyreModel, { onDelete: 'CASCADE' })
  model!: TyreModel;

  /** Référence interne Michelin — identique pour toutes les tailles du même modèle */
  @Column()
  globalId!: string;

  /** Désignation complète avec taille (ex: "25-622 (700X25C) POWER ROAD BLACK") */
  @Column({ nullable: true, type: 'text' })
  designation!: string | null;

  @Column({ nullable: true, type: 'integer' })
  widthMm!: number | null;

  @Column({ nullable: true, type: 'integer' })
  diameterEtrto!: number | null;

  @Column({ nullable: true, type: 'real' })
  diameterInch!: number | null;

  @Column({ nullable: true, type: 'integer' })
  weightG!: number | null;

  @Column({ nullable: true, type: 'text' })
  tpi!: string | null;

  @Column({ nullable: true, type: 'real' })
  minPressureBar!: number | null;

  @Column({ nullable: true, type: 'real' })
  maxPressureBar!: number | null;

  @Column({ nullable: true, type: 'text' })
  eanCode!: string | null;
}
