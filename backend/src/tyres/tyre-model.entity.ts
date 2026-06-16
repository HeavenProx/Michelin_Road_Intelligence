import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tyre_models')
export class TyreModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'global_id', unique: true })
  globalId!: string;

  @Column({ name: 'range_name' })
  rangeName!: string;

  @Column({ name: 'model_name' })
  modelName!: string;

  @Column()
  segment!: string;

  /** Type de vélo : ROAD, MTB, CITY */
  @Column({ name: 'cycle_type' })
  cycleType!: string;

  /** Type de vélo web (ex: ROAD, GRAVEL, MTB, COMMUTING & TOUR, E-BIKE) */
  @Column({ name: 'cycle_type_web', nullable: true, type: 'text' })
  cycleTypeWeb!: string | null;

  @Column({ nullable: true, type: 'text' })
  bead!: string | null;

  @Column({ nullable: true, type: 'text' })
  sealing!: string | null;

  /** Terrains supportés (virgule-séparé) ex: "ASPHALT,OFFROAD HARD PACKED" */
  @Column({ name: 'terrain_types', nullable: true, type: 'text' })
  terrainTypes!: string | null;

  /** Usages cibles (ex: "RACING", "ENDURANCE,ALL ROAD") */
  @Column({ name: 'use_type', nullable: true, type: 'text' })
  useType!: string | null;

  @Column({ name: 'rubber_technologies', nullable: true, type: 'text' })
  rubberTechnologies!: string | null;

  @Column({ name: 'casing_technologies', nullable: true, type: 'text' })
  casingTechnologies!: string | null;

  @Column({ name: 'tread_technologies', nullable: true, type: 'text' })
  treadTechnologies!: string | null;

  @Column({ name: 'reinforcement_technologies', nullable: true, type: 'text' })
  reinforcementTechnologies!: string | null;

  @Column({ name: 'sidewall_type', nullable: true, type: 'text' })
  sidewallType!: string | null;

  /** FRONT/REAR, FRONT, REAR */
  @Column({ nullable: true, type: 'text' })
  fitting!: string | null;

  /** Largeurs disponibles (JSON array ex: [23,25,28]) */
  @Column({ name: 'available_widths_mm', type: 'text', default: '[]' })
  availableWidthsMm!: string;

  /** Accroche par temps mouillé (1–5) */
  @Column({ name: 'score_wet_grip', type: 'integer', default: 3 })
  scoreWetGrip!: number;

  /** Résistance au roulement (1–5, 5 = très basse résistance) */
  @Column({ name: 'score_rolling_resistance', type: 'integer', default: 3 })
  scoreRollingResistance!: number;

  /** Durabilité (1–5) */
  @Column({ name: 'score_durability', type: 'integer', default: 3 })
  scoreDurability!: number;

  /** Polyvalence terrain (1–5) */
  @Column({ name: 'score_terrain_versatility', type: 'integer', default: 3 })
  scoreTerrainVersatility!: number;

  /** Kilométrage de vie estimé */
  @Column({ name: 'lifetime_km', type: 'integer', default: 5000 })
  lifetimeKm!: number;

  /** Fourchette de prix indicative */
  @Column({ name: 'price_range', nullable: true, type: 'text' })
  priceRange!: string | null;
}
