import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tyre_models')
export class TyreModel {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Identifiant catalogue Michelin (ex: BI-98). Un modèle = un Global ID. */
  @Column({ unique: true })
  globalId!: string;

  /** Nom complet de la gamme (ex: "MICHELIN POWER ROAD COMPETITION LINE") */
  @Column()
  rangeName!: string;

  /** Nom de gamme interne (ex: "POWER ROAD") */
  @Column()
  modelName!: string;

  /** Segment marketing */
  @Column()
  segment!: string;

  /** Type de vélo : ROAD, MTB, CITY */
  @Column()
  cycleType!: string;

  /** Type de vélo web (ex: ROAD, GRAVEL, MTB, COMMUTING & TOUR, E-BIKE) */
  @Column({ nullable: true, type: 'text' })
  cycleTypeWeb!: string | null;

  /** Type de talon : FOLDABLE BEAD, WIRE BEAD */
  @Column({ nullable: true, type: 'text' })
  bead!: string | null;

  /** Montage : TUBE TYPE, TUBELESS READY, TUBULAR */
  @Column({ nullable: true, type: 'text' })
  sealing!: string | null;

  /** Terrains supportés (virgule-séparé) ex: "ASPHALT,OFFROAD HARD PACKED" */
  @Column({ nullable: true, type: 'text' })
  terrainTypes!: string | null;

  /** Usages cibles (ex: "RACING", "ENDURANCE,ALL ROAD") */
  @Column({ nullable: true, type: 'text' })
  useType!: string | null;

  /** Technologies gomme (ex: GUM-X, MAGI-X) */
  @Column({ nullable: true, type: 'text' })
  rubberTechnologies!: string | null;

  @Column({ nullable: true, type: 'text' })
  casingTechnologies!: string | null;

  @Column({ nullable: true, type: 'text' })
  treadTechnologies!: string | null;

  @Column({ nullable: true, type: 'text' })
  reinforcementTechnologies!: string | null;

  @Column({ nullable: true, type: 'text' })
  sidewallType!: string | null;

  /** FRONT/REAR, FRONT, REAR */
  @Column({ nullable: true, type: 'text' })
  fitting!: string | null;

  /** Largeurs disponibles (JSON array ex: [23,25,28]) */
  @Column({ type: 'text', default: '[]' })
  availableWidthsMm!: string;

  // --- Scores calculés à l'import ---

  /** Accroche par temps mouillé (1–5) */
  @Column({ type: 'integer', default: 3 })
  scoreWetGrip!: number;

  /** Résistance au roulement (1–5, 5 = très basse résistance) */
  @Column({ type: 'integer', default: 3 })
  scoreRollingResistance!: number;

  /** Durabilité (1–5) */
  @Column({ type: 'integer', default: 3 })
  scoreDurability!: number;

  /** Polyvalence terrain (1–5) */
  @Column({ type: 'integer', default: 3 })
  scoreTerrainVersatility!: number;

  /** Kilométrage de vie estimé */
  @Column({ type: 'integer', default: 5000 })
  lifetimeKm!: number;

  /** Fourchette de prix indicative */
  @Column({ nullable: true, type: 'text' })
  priceRange!: string | null;
}
