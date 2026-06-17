# Garage pneu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le backend du garage pneu : vélos auto-importés de Strava, deux pneus (avant/arrière) par vélo, Tyre Score d'usure pondéré position × terrain, remplacement avec archivage et historique.

**Architecture:** Nouveau module NestJS `backend/src/garage/` exposant des routes `/api/garage*`, sur le modèle des modules existants (`recommend`, `avis`). Deux entités TypeORM (`Bike`, `GarageTyre` — entité unique montée/archivée). Le calcul d'usure est une fonction pure isolée (`garage.wear.ts`) testée unitairement. Les km viennent de `StravaService.getCyclingActivities` filtrées par `gearId`.

**Tech Stack:** NestJS 11, TypeScript, TypeORM (`better-sqlite3`, `synchronize: true`), class-validator, Jest. Gestionnaire `pnpm`.

## Global Constraints

- **pnpm uniquement**, commandes lancées **depuis `backend/`**. Ne pas committer `package-lock.json`.
- **Projet en français** : commits, commentaires, libellés en français. **Aucun crédit/footer Claude.**
- Controllers sous `@Controller('api')`, routes protégées via `AuthenticatedGuard` + `if (!req.user) throw new UnauthorizedException()`. Endpoint démo **sans** auth.
- TypeORM `synchronize: true` → pas de migration ; toute nouvelle entité doit être ajoutée au tableau `entities` de `backend/src/app.module.ts`.
- Réponses JSON en **snake_case** (cohérence avec `/api/recommend`), services renvoyant des littéraux d'objet.
- Coefficients d'usure : `coeffPosition` avant `1.0` / arrière `1.9`. `coeffTerrain` asphalte `1.0` / offroad `1.4`. Seuils de statut : `<55` Bon état, `55–79` À surveiller, `≥80` À remplacer.

---

### Task 1: Récupération des vélos Strava (`getAthleteBikes`)

**Files:**
- Modify: `backend/src/strava/strava.types.ts` (ajout des types `StravaBikeRaw`, `StravaBike`)
- Modify: `backend/src/strava/strava.service.ts` (ajout méthode `getAthleteBikes`)
- Test: `backend/src/strava/strava.service.spec.ts` (ajout d'un describe)

**Interfaces:**
- Consumes: `AuthService.getValidAccessToken(user): Promise<string>` (déjà existant) ; `User` entity.
- Produces:
  - `StravaBike { gearId: string; name: string; distanceKm: number; primary: boolean }`
  - `StravaService.getAthleteBikes(user: User): Promise<StravaBike[]>`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `backend/src/strava/strava.service.spec.ts` (le fichier mocke déjà `fetch` ; réutiliser son helper `okJson` s'il existe, sinon le mock ci-dessous est autonome) :

```ts
describe('getAthleteBikes', () => {
  it('mappe les vélos de GET /athlete vers StravaBike[]', async () => {
    const user = { stravaId: 1 } as unknown as User;
    const authService = {
      getValidAccessToken: jest.fn().mockResolvedValue('tok'),
    } as unknown as AuthService;
    const service = new StravaService(authService);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        bikes: [
          { id: 'b123', name: 'Tarmac', distance: 1_500_000, primary: true },
          { id: 'b456', name: 'Checkpoint', distance: 800_000 },
        ],
      }),
    }) as unknown as typeof fetch;

    const bikes = await service.getAthleteBikes(user);

    expect(bikes).toEqual([
      { gearId: 'b123', name: 'Tarmac', distanceKm: 1500, primary: true },
      { gearId: 'b456', name: 'Checkpoint', distanceKm: 800, primary: false },
    ]);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run (depuis `backend/`): `pnpm test -- strava.service`
Expected: FAIL — `getAthleteBikes is not a function`.

- [ ] **Step 3: Ajouter les types**

Dans `backend/src/strava/strava.types.ts`, à la fin du fichier :

```ts
/** Vélo brut renvoyé dans le champ `bikes[]` de GET /athlete (DetailedAthlete). */
export interface StravaBikeRaw {
  id: string;
  name: string;
  /** Distance totale en mètres. */
  distance: number;
  primary?: boolean;
}

/** Vélo normalisé (km) exploité par le garage. */
export interface StravaBike {
  /** gear_id Strava (ex: "b123"). */
  gearId: string;
  name: string;
  distanceKm: number;
  primary: boolean;
}
```

- [ ] **Step 4: Implémenter `getAthleteBikes`**

Dans `backend/src/strava/strava.service.ts` :

Ajouter l'import des types en tête (compléter la ligne d'import existante) :

```ts
import type {
  CyclingActivity,
  StravaBike,
  StravaBikeRaw,
  StravaSummaryActivityRaw,
} from './strava.types';
```

Ajouter la constante d'URL près de `STRAVA_ACTIVITIES_URL` :

```ts
const STRAVA_ATHLETE_URL = 'https://www.strava.com/api/v3/athlete';
```

Ajouter la méthode publique dans la classe (après `kmRiddenSince`) :

```ts
/**
 * Liste les vélos du compte Strava (DetailedAthlete.bikes), normalisés en km.
 * Sert à peupler le garage.
 */
async getAthleteBikes(user: User): Promise<StravaBike[]> {
  const token = await this.authService.getValidAccessToken(user);
  const res = await fetch(STRAVA_ATHLETE_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    this.logger.error(`GET /athlete a échoué (${res.status}): ${detail}`);
    throw new HttpException(
      `Échec de la récupération du profil Strava (HTTP ${res.status}).`,
      HttpStatus.BAD_GATEWAY,
    );
  }

  const data = (await res.json()) as { bikes?: StravaBikeRaw[] };
  return (data.bikes ?? []).map((b) => ({
    gearId: b.id,
    name: b.name,
    distanceKm: Math.round((b.distance ?? 0) / 1000),
    primary: b.primary ?? false,
  }));
}
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run (depuis `backend/`): `pnpm test -- strava.service`
Expected: PASS (tous les tests du fichier).

- [ ] **Step 6: Commit**

```bash
git add backend/src/strava/strava.types.ts backend/src/strava/strava.service.ts backend/src/strava/strava.service.spec.ts
git commit -m "feat(garage): recuperation des velos Strava (getAthleteBikes)"
```

---

### Task 2: Entités `Bike` + `GarageTyre` et module garage

**Files:**
- Create: `backend/src/garage/bike.entity.ts`
- Create: `backend/src/garage/garage-tyre.entity.ts`
- Create: `backend/src/garage/garage.module.ts`
- Modify: `backend/src/app.module.ts` (enregistrer les entités + importer `GarageModule`)
- Test: `backend/src/garage/garage.module.spec.ts`

**Interfaces:**
- Consumes: `User` (`../users/user.entity`), `TyreModel` (`../tyres/tyre-model.entity`), `StravaModule`, `ProfileModule`, `AuthModule`.
- Produces:
  - `type TyrePosition = 'FRONT' | 'REAR'` et `type TyreStatus = 'MOUNTED' | 'RETIRED'` (exportés depuis `garage-tyre.entity.ts`)
  - Entité `Bike` : `id, userId, stravaGearId, name, type, stravaDistanceKm, lastSyncedAt`
  - Entité `GarageTyre` : `id, bikeId, position, tyreModel(eager), tyreModelId, mountedDate, status, removedDate, kmHeld, durationMonths, finalWearPercent`

- [ ] **Step 1: Écrire le test qui échoue**

`backend/src/garage/garage.module.spec.ts` :

```ts
import { Bike } from './bike.entity';
import { GarageTyre } from './garage-tyre.entity';

describe('Entités garage', () => {
  it('instancie un Bike avec ses champs', () => {
    const bike = new Bike();
    bike.stravaGearId = 'b123';
    bike.name = 'Tarmac';
    expect(bike.stravaGearId).toBe('b123');
  });

  it('instancie un GarageTyre monté par défaut sémantique', () => {
    const tyre = new GarageTyre();
    tyre.position = 'REAR';
    tyre.status = 'MOUNTED';
    expect(tyre.position).toBe('REAR');
    expect(tyre.status).toBe('MOUNTED');
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run (depuis `backend/`): `pnpm test -- garage.module`
Expected: FAIL — modules `./bike.entity` / `./garage-tyre.entity` introuvables.

- [ ] **Step 3: Créer l'entité `Bike`**

`backend/src/garage/bike.entity.ts` :

```ts
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
```

- [ ] **Step 4: Créer l'entité `GarageTyre`**

`backend/src/garage/garage-tyre.entity.ts` :

```ts
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
```

- [ ] **Step 5: Créer le module garage**

`backend/src/garage/garage.module.ts` (providers/controllers ajoutés dans les tâches suivantes) :

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProfileModule } from '../profile/profile.module';
import { StravaModule } from '../strava/strava.module';
import { Bike } from './bike.entity';
import { GarageTyre } from './garage-tyre.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bike, GarageTyre]),
    StravaModule,
    ProfileModule,
    AuthModule,
  ],
})
export class GarageModule {}
```

- [ ] **Step 6: Enregistrer entités + module dans `AppModule`**

Dans `backend/src/app.module.ts` :

Ajouter les imports :

```ts
import { GarageModule } from './garage/garage.module';
import { Bike } from './garage/bike.entity';
import { GarageTyre } from './garage/garage-tyre.entity';
```

Ajouter `Bike, GarageTyre` au tableau `entities` :

```ts
entities: [User, TyreModel, TyreSize, ProfileSnapshot, Review, Bike, GarageTyre],
```

Ajouter `GarageModule` à la liste `imports` du `@Module` (après `AvisModule`).

- [ ] **Step 7: Lancer le test + build**

Run (depuis `backend/`): `pnpm test -- garage.module && pnpm build`
Expected: tests PASS, build sans erreur (entités chargées, AppModule compile).

- [ ] **Step 8: Commit**

```bash
git add backend/src/garage/bike.entity.ts backend/src/garage/garage-tyre.entity.ts backend/src/garage/garage.module.ts backend/src/garage/garage.module.spec.ts backend/src/app.module.ts
git commit -m "feat(garage): entites Bike et GarageTyre + module"
```

---

### Task 3: Calcul du Tyre Score (fonction pure)

**Files:**
- Create: `backend/src/garage/garage.wear.ts`
- Test: `backend/src/garage/garage.wear.spec.ts`

**Interfaces:**
- Consumes: `CyclingActivity` (`../strava/strava.types`), `TyrePosition` (`./garage-tyre.entity`).
- Produces:
  - `TyreScore { kmUsed: number; kmMaxAdjusted: number; kmLeft: number; wearPercent: number; statusLabel: string; coeffTerrainMoyen: number }`
  - `terrainCoeff(activity: CyclingActivity): number`
  - `statusLabel(wearPercent: number): string`
  - `computeTyreScore(activities: CyclingActivity[], position: TyrePosition, lifetimeKm: number, mountedDate: string, now: Date): TyreScore`

- [ ] **Step 1: Écrire les tests qui échouent**

`backend/src/garage/garage.wear.spec.ts` :

```ts
import type { CyclingActivity } from '../strava/strava.types';
import { computeTyreScore, statusLabel, terrainCoeff } from './garage.wear';

function act(partial: Partial<CyclingActivity>): CyclingActivity {
  return {
    id: 1,
    name: 'ride',
    sportType: 'Ride',
    distanceKm: 100,
    movingTimeS: 0,
    elapsedTimeS: 0,
    totalElevationGainM: 0,
    elevHighM: null,
    elevLowM: null,
    averageSpeedKmh: 25,
    maxSpeedKmh: 0,
    averageWatts: null,
    deviceWatts: false,
    startDate: '2025-09-01T08:00:00Z',
    startDateLocal: '2025-09-01T10:00:00',
    startLatlng: null,
    trainer: false,
    commute: false,
    manual: false,
    gearId: 'b1',
    ...partial,
  };
}

describe('terrainCoeff', () => {
  it('vaut 1.0 sur route', () => {
    expect(terrainCoeff(act({ sportType: 'Ride' }))).toBe(1.0);
  });
  it('vaut 1.4 en gravel/VTT', () => {
    expect(terrainCoeff(act({ sportType: 'GravelRide' }))).toBe(1.4);
    expect(terrainCoeff(act({ sportType: 'MountainBikeRide' }))).toBe(1.4);
  });
});

describe('statusLabel', () => {
  it('classe selon les seuils', () => {
    expect(statusLabel(10)).toBe('Bon état');
    expect(statusLabel(60)).toBe('À surveiller');
    expect(statusLabel(85)).toBe('À remplacer');
  });
});

describe('computeTyreScore', () => {
  const now = new Date('2025-10-01T00:00:00Z');

  it('use plus vite à l’arrière (kmMax ajusté plus bas)', () => {
    const acts = [act({ distanceKm: 1000, sportType: 'Ride' })];
    const front = computeTyreScore(acts, 'FRONT', 5000, '2025-08-01', now);
    const rear = computeTyreScore(acts, 'REAR', 5000, '2025-08-01', now);
    expect(front.kmMaxAdjusted).toBe(5000); // 5000 / (1.0 * 1.0)
    expect(rear.kmMaxAdjusted).toBe(2632); // 5000 / (1.9 * 1.0), arrondi
    expect(rear.wearPercent).toBeGreaterThan(front.wearPercent);
  });

  it('ignore home-trainer, saisie manuelle et activités avant la pose', () => {
    const acts = [
      act({ distanceKm: 500 }),
      act({ distanceKm: 999, trainer: true }),
      act({ distanceKm: 999, manual: true }),
      act({ distanceKm: 999, startDate: '2025-07-01T08:00:00Z' }),
    ];
    const score = computeTyreScore(acts, 'FRONT', 5000, '2025-08-01', now);
    expect(score.kmUsed).toBe(500);
  });

  it('plafonne l’usure à 100%', () => {
    const acts = [act({ distanceKm: 10000 })];
    const score = computeTyreScore(acts, 'FRONT', 5000, '2025-08-01', now);
    expect(score.wearPercent).toBe(100);
    expect(score.kmLeft).toBe(0);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run (depuis `backend/`): `pnpm test -- garage.wear`
Expected: FAIL — module `./garage.wear` introuvable.

- [ ] **Step 3: Implémenter la fonction pure**

`backend/src/garage/garage.wear.ts` :

```ts
import type { CyclingActivity } from '../strava/strava.types';
import type { TyrePosition } from './garage-tyre.entity';

/** Pneu arrière : porte plus de charge + transmet la puissance → use ~1.9×. */
const POSITION_COEFF: Record<TyrePosition, number> = { FRONT: 1.0, REAR: 1.9 };

/** Disciplines hors-asphalte : abrasion accrue. */
const OFFROAD_SPORTS = new Set([
  'GravelRide',
  'MountainBikeRide',
  'EMountainBikeRide',
]);

export interface TyreScore {
  kmUsed: number;
  kmMaxAdjusted: number;
  kmLeft: number;
  wearPercent: number;
  statusLabel: string;
  coeffTerrainMoyen: number;
}

/** Coefficient terrain d'une activité : 1.0 route, 1.4 offroad. */
export function terrainCoeff(activity: CyclingActivity): number {
  return OFFROAD_SPORTS.has(activity.sportType) ? 1.4 : 1.0;
}

export function statusLabel(wearPercent: number): string {
  if (wearPercent >= 80) return 'À remplacer';
  if (wearPercent >= 55) return 'À surveiller';
  return 'Bon état';
}

/**
 * Estime l'usure d'un pneu depuis sa pose.
 * `kmMaxAjusté = lifetimeKm / (coeffPosition × coeffTerrainMoyen)`,
 * `usure% = kmUsed / kmMaxAjusté`. Exclut home-trainer / saisie manuelle
 * et les activités antérieures à la date de pose.
 */
export function computeTyreScore(
  activities: CyclingActivity[],
  position: TyrePosition,
  lifetimeKm: number,
  mountedDate: string,
  now: Date,
): TyreScore {
  void now; // signature homogène avec les helpers temporels du service
  const mountedMs = new Date(mountedDate).getTime();
  const relevant = activities.filter(
    (a) =>
      !a.trainer &&
      !a.manual &&
      new Date(a.startDate).getTime() >= mountedMs,
  );

  const kmUsed = round1(relevant.reduce((s, a) => s + a.distanceKm, 0));
  const weightedKm = relevant.reduce(
    (s, a) => s + a.distanceKm * terrainCoeff(a),
    0,
  );
  const coeffTerrainMoyen = kmUsed > 0 ? round2(weightedKm / kmUsed) : 1.0;

  const kmMaxAdjusted = Math.round(
    lifetimeKm / (POSITION_COEFF[position] * coeffTerrainMoyen),
  );
  const wearPercent = clamp(
    0,
    100,
    Math.round((kmUsed / kmMaxAdjusted) * 100),
  );
  const kmLeft = Math.max(0, Math.round(kmMaxAdjusted - kmUsed));

  return {
    kmUsed,
    kmMaxAdjusted,
    kmLeft,
    wearPercent,
    statusLabel: statusLabel(wearPercent),
    coeffTerrainMoyen,
  };
}

function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run (depuis `backend/`): `pnpm test -- garage.wear`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/garage/garage.wear.ts backend/src/garage/garage.wear.spec.ts
git commit -m "feat(garage): calcul pur du Tyre Score (usure position x terrain)"
```

---

### Task 4: Synchronisation des vélos (`GarageService.syncBikes`)

**Files:**
- Create: `backend/src/garage/garage.service.ts`
- Modify: `backend/src/garage/garage.module.ts` (ajouter `GarageService` aux providers + exports)
- Test: `backend/src/garage/garage.service.spec.ts`

**Interfaces:**
- Consumes: `StravaService.getAthleteBikes` (Task 1) ; repositories `Bike`, `GarageTyre`, `TyreModel` ; `ProfileService.getProfile`.
- Produces: `GarageService` avec le constructeur ci-dessous et `syncBikes(user: User): Promise<Bike[]>` (upsert par `(userId, stravaGearId)`, met à jour `name`, `type` déduit, `stravaDistanceKm`, `lastSyncedAt`).

> Le constructeur déclare **dès maintenant** toutes les dépendances utilisées par les tâches 5–7 pour éviter de le remanier ensuite.

- [ ] **Step 1: Écrire le test qui échoue**

`backend/src/garage/garage.service.spec.ts` :

```ts
import type { Repository } from 'typeorm';
import type { StravaService } from '../strava/strava.service';
import type { ProfileService } from '../profile/profile.service';
import type { User } from '../users/user.entity';
import { Bike } from './bike.entity';
import { GarageTyre } from './garage-tyre.entity';
import type { TyreModel } from '../tyres/tyre-model.entity';
import { GarageService } from './garage.service';

const user = { id: 7 } as User;

function makeService(over: {
  bikeRepo?: Partial<Repository<Bike>>;
  tyreRepo?: Partial<Repository<GarageTyre>>;
  modelRepo?: Partial<Repository<TyreModel>>;
  strava?: Partial<StravaService>;
  profile?: Partial<ProfileService>;
} = {}) {
  return new GarageService(
    (over.bikeRepo ?? {}) as Repository<Bike>,
    (over.tyreRepo ?? {}) as Repository<GarageTyre>,
    (over.modelRepo ?? {}) as Repository<TyreModel>,
    (over.strava ?? {}) as StravaService,
    (over.profile ?? {}) as ProfileService,
  );
}

describe('GarageService.syncBikes', () => {
  it('crée les vélos absents et met à jour les existants', async () => {
    const existing = Object.assign(new Bike(), {
      id: 1,
      userId: 7,
      stravaGearId: 'b1',
      name: 'Ancien nom',
      stravaDistanceKm: 0,
    });
    const saved: Bike[] = [];
    const service = makeService({
      strava: {
        getAthleteBikes: jest.fn().mockResolvedValue([
          { gearId: 'b1', name: 'Tarmac', distanceKm: 1500, primary: true },
          { gearId: 'b2', name: 'Checkpoint', distanceKm: 800, primary: false },
        ]),
      },
      bikeRepo: {
        find: jest.fn().mockResolvedValue([existing]),
        create: jest.fn((d) => Object.assign(new Bike(), d)),
        save: jest.fn(async (b) => {
          saved.push(b as Bike);
          return b;
        }),
      },
    });

    const result = await service.syncBikes(user);

    expect(result).toHaveLength(2);
    expect(saved.find((b) => b.stravaGearId === 'b1')?.name).toBe('Tarmac');
    expect(saved.find((b) => b.stravaGearId === 'b2')?.name).toBe('Checkpoint');
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run (depuis `backend/`): `pnpm test -- garage.service`
Expected: FAIL — module `./garage.service` introuvable.

- [ ] **Step 3: Implémenter `GarageService` + `syncBikes`**

`backend/src/garage/garage.service.ts` :

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileService } from '../profile/profile.service';
import { StravaService } from '../strava/strava.service';
import { TyreModel } from '../tyres/tyre-model.entity';
import type { User } from '../users/user.entity';
import { Bike } from './bike.entity';
import { GarageTyre } from './garage-tyre.entity';

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
}
```

- [ ] **Step 4: Déclarer le provider dans le module**

Dans `backend/src/garage/garage.module.ts`, importer et enregistrer le service :

```ts
import { GarageService } from './garage.service';
```

Compléter le décorateur :

```ts
  providers: [GarageService],
  exports: [GarageService],
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run (depuis `backend/`): `pnpm test -- garage.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/garage/garage.service.ts backend/src/garage/garage.module.ts backend/src/garage/garage.service.spec.ts
git commit -m "feat(garage): synchronisation des velos Strava (syncBikes)"
```

---

### Task 5: Lecture du garage, historique et démo

**Files:**
- Modify: `backend/src/garage/garage.service.ts` (ajout `getGarage`, `getHistory`, `getDemoGarage` + types de réponse + helper `buildExplanation`)
- Test: `backend/src/garage/garage.service.spec.ts` (ajout de describes)

**Interfaces:**
- Consumes: `computeTyreScore` (Task 3) ; `StravaService.getCyclingActivities(user, opts): Promise<CyclingActivity[]>` ; `ProfileService.getProfile(user): Promise<RiderProfile>` (`weather_exposure.rain_percentage`, `style_label`).
- Produces (exportés depuis `garage.service.ts`) :
  - `TyreDto { id; position; model: { name; lifetime_km; price_range }; mounted_date; km_used; km_max_adjusted; km_left; wear_percent; status_label; explanation }`
  - `BikeDto { id; name; type; strava_distance_km; tyres: TyreDto[] }`
  - `GarageResponse { success: true; bikes: BikeDto[] }`
  - `GarageService.getGarage(user): Promise<GarageResponse>`
  - `GarageService.getHistory(user): Promise<{ success: true; bikes: Array<{ id; name; retired: Array<{ model; km_held; duration_months; final_wear_percent; mounted_date; removed_date }> }> }>`
  - `GarageService.getDemoGarage(): GarageResponse`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter dans `backend/src/garage/garage.service.spec.ts` :

```ts
import type { CyclingActivity } from '../strava/strava.types';

describe('GarageService.getGarage', () => {
  it('assemble vélos + pneus montés + Tyre Scores', async () => {
    const bike = Object.assign(new Bike(), {
      id: 1,
      userId: 7,
      stravaGearId: 'b1',
      name: 'Tarmac',
      type: 'ROAD',
      stravaDistanceKm: 1500,
      lastSyncedAt: Date.now(),
    });
    const tyre = Object.assign(new GarageTyre(), {
      id: 10,
      bikeId: 1,
      position: 'REAR',
      mountedDate: '2025-08-01',
      status: 'MOUNTED',
      tyreModel: { modelName: 'POWER ROAD', lifetimeKm: 5000, priceRange: '45 – 58 €' },
    });
    const activity = {
      sportType: 'Ride',
      distanceKm: 500,
      startDate: '2025-09-01T08:00:00Z',
      trainer: false,
      manual: false,
      gearId: 'b1',
    } as CyclingActivity;

    const service = makeService({
      bikeRepo: { find: jest.fn().mockResolvedValue([bike]) },
      tyreRepo: { find: jest.fn().mockResolvedValue([tyre]) },
      strava: {
        getAthleteBikes: jest.fn().mockResolvedValue([
          { gearId: 'b1', name: 'Tarmac', distanceKm: 1500, primary: true },
        ]),
        getCyclingActivities: jest.fn().mockResolvedValue([activity]),
      },
      profile: {
        getProfile: jest.fn().mockResolvedValue({
          style_label: 'Endurance',
          weather_exposure: { rain_percentage: 28, rainy_rides: 5 },
        }),
      },
    });

    const garage = await service.getGarage(user);

    expect(garage.success).toBe(true);
    expect(garage.bikes[0].tyres[0].position).toBe('REAR');
    expect(garage.bikes[0].tyres[0].km_used).toBe(500);
    expect(garage.bikes[0].tyres[0].status_label).toBeDefined();
    expect(garage.bikes[0].tyres[0].explanation).toContain('arrière');
  });
});

describe('GarageService.getDemoGarage', () => {
  it('renvoie un jeu démo avec au moins un vélo et des pneus', () => {
    const demo = makeService().getDemoGarage();
    expect(demo.success).toBe(true);
    expect(demo.bikes.length).toBeGreaterThan(0);
    expect(demo.bikes[0].tyres.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run (depuis `backend/`): `pnpm test -- garage.service`
Expected: FAIL — `getGarage` / `getDemoGarage` non définis.

- [ ] **Step 3: Implémenter lecture + historique + démo + explication**

Dans `backend/src/garage/garage.service.ts`, ajouter les imports :

```ts
import type { CyclingActivity } from '../strava/strava.types';
import type { RiderProfile } from '../profile/profile.types';
import {
  computeTyreScore,
  type TyreScore,
} from './garage.wear';
import type { TyrePosition } from './garage-tyre.entity';
```

Ajouter les types de réponse en haut du fichier (après les imports) :

```ts
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
```

Ajouter les méthodes dans la classe :

```ts
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
  const result = [];
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
      `Avec ${rain}% de sorties sous la pluie, surveillez l’accroche sur la fin de vie.`,
    );
  }
  return parts.join(' ');
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
            model: { name: 'POWER ROAD', lifetime_km: 8000, price_range: '45 – 58 €' },
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
            model: { name: 'POWER ROAD', lifetime_km: 8000, price_range: '45 – 58 €' },
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
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run (depuis `backend/`): `pnpm test -- garage.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/garage/garage.service.ts backend/src/garage/garage.service.spec.ts
git commit -m "feat(garage): lecture du garage, historique et jeu demo"
```

---

### Task 6: Assigner / modifier un pneu monté (`setTyre`)

**Files:**
- Create: `backend/src/garage/dto/set-tyre.dto.ts`
- Modify: `backend/src/garage/garage.service.ts` (ajout `setTyre`)
- Test: `backend/src/garage/garage.service.spec.ts` (ajout describe)

**Interfaces:**
- Consumes: repos `Bike`, `GarageTyre`, `TyreModel`.
- Produces:
  - `SetTyreDto { bikeId: number; position: 'FRONT' | 'REAR'; modelGlobalId: string; mountedDate: string }`
  - `GarageService.setTyre(user: User, dto: SetTyreDto): Promise<GarageTyre>` — vérifie que le vélo appartient à l'utilisateur (sinon `NotFoundException`), résout le `TyreModel` par `globalId` (sinon `NotFoundException`), upsert le pneu `MOUNTED` à `(bike, position)`.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `backend/src/garage/garage.service.spec.ts` :

```ts
import { NotFoundException } from '@nestjs/common';

describe('GarageService.setTyre', () => {
  const dto = {
    bikeId: 1,
    position: 'FRONT' as const,
    modelGlobalId: 'g-power-road',
    mountedDate: '2025-08-15',
  };

  it('crée un pneu monté quand aucun n’existe à cette position', async () => {
    const saved: GarageTyre[] = [];
    const service = makeService({
      bikeRepo: {
        findOne: jest.fn().mockResolvedValue(
          Object.assign(new Bike(), { id: 1, userId: 7 }),
        ),
      },
      modelRepo: {
        findOne: jest.fn().mockResolvedValue({ id: 99, modelName: 'POWER ROAD' }),
      },
      tyreRepo: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((d) => Object.assign(new GarageTyre(), d)),
        save: jest.fn(async (t) => {
          saved.push(t as GarageTyre);
          return t;
        }),
      },
    });

    await service.setTyre(user, dto);

    expect(saved[0].bikeId).toBe(1);
    expect(saved[0].tyreModelId).toBe(99);
    expect(saved[0].status).toBe('MOUNTED');
  });

  it('rejette un vélo qui n’appartient pas à l’utilisateur', async () => {
    const service = makeService({
      bikeRepo: { findOne: jest.fn().mockResolvedValue(null) },
    });
    await expect(service.setTyre(user, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run (depuis `backend/`): `pnpm test -- garage.service`
Expected: FAIL — `setTyre` non défini.

- [ ] **Step 3: Créer le DTO**

`backend/src/garage/dto/set-tyre.dto.ts` :

```ts
import { IsDateString, IsIn, IsInt, IsString } from 'class-validator';

export class SetTyreDto {
  @IsInt()
  bikeId!: number;

  @IsIn(['FRONT', 'REAR'])
  position!: 'FRONT' | 'REAR';

  @IsString()
  modelGlobalId!: string;

  @IsDateString()
  mountedDate!: string;
}
```

- [ ] **Step 4: Implémenter `setTyre`**

Dans `backend/src/garage/garage.service.ts`, ajouter l'import :

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { SetTyreDto } from './dto/set-tyre.dto';
```

Ajouter la méthode dans la classe :

```ts
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
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run (depuis `backend/`): `pnpm test -- garage.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/garage/dto/set-tyre.dto.ts backend/src/garage/garage.service.ts backend/src/garage/garage.service.spec.ts
git commit -m "feat(garage): assignation d'un pneu monte (setTyre)"
```

---

### Task 7: Remplacer un pneu (archivage + nouveau) (`replaceTyre`)

**Files:**
- Create: `backend/src/garage/dto/replace-tyre.dto.ts`
- Modify: `backend/src/garage/garage.service.ts` (ajout `replaceTyre` + helper `monthsBetween`)
- Test: `backend/src/garage/garage.service.spec.ts` (ajout describe)

**Interfaces:**
- Consumes: `computeTyreScore` (Task 3) ; `StravaService.getCyclingActivities` ; repos.
- Produces:
  - `ReplaceTyreDto { modelGlobalId: string; mountedDate: string }`
  - `GarageService.replaceTyre(user: User, tyreId: number, dto: ReplaceTyreDto): Promise<GarageTyre>` — archive l'ancien (`status=RETIRED`, `removedDate`, `kmHeld`, `durationMonths`, `finalWearPercent` figés) et crée le nouveau pneu `MOUNTED` sur le même `(bike, position)`.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `backend/src/garage/garage.service.spec.ts` :

```ts
describe('GarageService.replaceTyre', () => {
  it('archive l’ancien pneu et monte le nouveau', async () => {
    const bike = Object.assign(new Bike(), {
      id: 1,
      userId: 7,
      stravaGearId: 'b1',
    });
    const old = Object.assign(new GarageTyre(), {
      id: 10,
      bikeId: 1,
      bike,
      position: 'REAR',
      status: 'MOUNTED',
      mountedDate: '2025-01-01',
      tyreModel: { lifetimeKm: 5000 },
    });
    const saved: GarageTyre[] = [];
    const service = makeService({
      tyreRepo: {
        findOne: jest.fn().mockResolvedValue(old),
        create: jest.fn((d) => Object.assign(new GarageTyre(), d)),
        save: jest.fn(async (t) => {
          saved.push(t as GarageTyre);
          return t;
        }),
      },
      modelRepo: {
        findOne: jest.fn().mockResolvedValue({ id: 99, modelName: 'POWER ROAD' }),
      },
      strava: {
        getCyclingActivities: jest.fn().mockResolvedValue([
          {
            sportType: 'Ride',
            distanceKm: 1000,
            startDate: '2025-03-01T08:00:00Z',
            trainer: false,
            manual: false,
            gearId: 'b1',
          },
        ]),
      },
    });

    await service.replaceTyre(user, 10, {
      modelGlobalId: 'g-power-road',
      mountedDate: '2025-09-01',
    });

    const archived = saved.find((t) => t.status === 'RETIRED');
    const mounted = saved.find((t) => t.status === 'MOUNTED');
    expect(archived?.kmHeld).toBe(1000);
    expect(archived?.removedDate).toBeTruthy();
    expect(archived?.durationMonths).toBeGreaterThan(0);
    expect(mounted?.tyreModelId).toBe(99);
    expect(mounted?.position).toBe('REAR');
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run (depuis `backend/`): `pnpm test -- garage.service`
Expected: FAIL — `replaceTyre` non défini.

- [ ] **Step 3: Créer le DTO**

`backend/src/garage/dto/replace-tyre.dto.ts` :

```ts
import { IsDateString, IsString } from 'class-validator';

export class ReplaceTyreDto {
  @IsString()
  modelGlobalId!: string;

  @IsDateString()
  mountedDate!: string;
}
```

- [ ] **Step 4: Implémenter `replaceTyre`**

Dans `backend/src/garage/garage.service.ts`, ajouter l'import :

```ts
import { ReplaceTyreDto } from './dto/replace-tyre.dto';
```

Ajouter la méthode + le helper dans la classe :

```ts
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
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run (depuis `backend/`): `pnpm test -- garage.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/garage/dto/replace-tyre.dto.ts backend/src/garage/garage.service.ts backend/src/garage/garage.service.spec.ts
git commit -m "feat(garage): remplacement d'un pneu avec archivage (replaceTyre)"
```

---

### Task 8: Controller `/api/garage*` (intégration)

**Files:**
- Create: `backend/src/garage/garage.controller.ts`
- Modify: `backend/src/garage/garage.module.ts` (déclarer le controller)
- Test: `backend/src/garage/garage.controller.spec.ts`

**Interfaces:**
- Consumes: `GarageService` (tâches 4–7) ; `AuthenticatedGuard` ; `SetTyreDto`, `ReplaceTyreDto`.
- Produces: routes `GET /api/garage`, `GET /api/garage/demo`, `GET /api/garage/history`, `PUT /api/garage/tyres`, `POST /api/garage/tyres/:id/replace`, `POST /api/garage/sync`.

> Note d'ordre de route Nest : déclarer `demo` et `history` (chemins statiques) ne crée pas de conflit avec `/api/garage` ; aucune route paramétrée ne préfixe `garage`, donc l'ordre des méthodes est sans incidence ici.

- [ ] **Step 1: Écrire le test qui échoue**

`backend/src/garage/garage.controller.spec.ts` :

```ts
import type { Request } from 'express';
import type { User } from '../users/user.entity';
import { GarageController } from './garage.controller';
import type { GarageService } from './garage.service';

const user = { id: 7 } as User;
const req = { user } as unknown as Request;

describe('GarageController', () => {
  it('GET /api/garage délègue à getGarage', async () => {
    const service = {
      getGarage: jest.fn().mockResolvedValue({ success: true, bikes: [] }),
    } as unknown as GarageService;
    const controller = new GarageController(service);

    const res = await controller.getGarage(req);

    expect(service.getGarage).toHaveBeenCalledWith(user);
    expect(res.success).toBe(true);
  });

  it('GET /api/garage/demo ne requiert pas d’utilisateur', () => {
    const service = {
      getDemoGarage: jest.fn().mockReturnValue({ success: true, bikes: [] }),
    } as unknown as GarageService;
    const controller = new GarageController(service);

    const res = controller.getDemo();

    expect(res.success).toBe(true);
  });

  it('PUT /api/garage/tyres délègue à setTyre', async () => {
    const dto = {
      bikeId: 1,
      position: 'FRONT' as const,
      modelGlobalId: 'g1',
      mountedDate: '2025-08-15',
    };
    const service = {
      setTyre: jest.fn().mockResolvedValue({ id: 5 }),
    } as unknown as GarageService;
    const controller = new GarageController(service);

    await controller.setTyre(req, dto);

    expect(service.setTyre).toHaveBeenCalledWith(user, dto);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run (depuis `backend/`): `pnpm test -- garage.controller`
Expected: FAIL — module `./garage.controller` introuvable.

- [ ] **Step 3: Implémenter le controller**

`backend/src/garage/garage.controller.ts` :

```ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { ReplaceTyreDto } from './dto/replace-tyre.dto';
import { SetTyreDto } from './dto/set-tyre.dto';
import { GarageService } from './garage.service';

@Controller('api/garage')
export class GarageController {
  constructor(private readonly garage: GarageService) {}

  @Get()
  @UseGuards(AuthenticatedGuard)
  getGarage(@Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    return this.garage.getGarage(req.user);
  }

  @Get('demo')
  getDemo() {
    return this.garage.getDemoGarage();
  }

  @Get('history')
  @UseGuards(AuthenticatedGuard)
  getHistory(@Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    return this.garage.getHistory(req.user);
  }

  @Put('tyres')
  @UseGuards(AuthenticatedGuard)
  setTyre(@Req() req: Request, @Body() dto: SetTyreDto) {
    if (!req.user) throw new UnauthorizedException();
    return this.garage.setTyre(req.user, dto);
  }

  @Post('tyres/:id/replace')
  @UseGuards(AuthenticatedGuard)
  replaceTyre(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceTyreDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.garage.replaceTyre(req.user, id, dto);
  }

  @Post('sync')
  @UseGuards(AuthenticatedGuard)
  sync(@Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    return this.garage.syncBikes(req.user);
  }
}
```

- [ ] **Step 4: Déclarer le controller dans le module**

Dans `backend/src/garage/garage.module.ts`, importer et ajouter :

```ts
import { GarageController } from './garage.controller';
```

```ts
  controllers: [GarageController],
```

- [ ] **Step 5: Lancer les tests + build complet**

Run (depuis `backend/`): `pnpm test -- garage && pnpm build`
Expected: tous les tests garage PASS, build sans erreur.

- [ ] **Step 6: Vérifier le lint**

Run (depuis `backend/`): `pnpm lint`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add backend/src/garage/garage.controller.ts backend/src/garage/garage.controller.spec.ts backend/src/garage/garage.module.ts
git commit -m "feat(garage): controller /api/garage et cablage du module"
```

---

## Notes hors périmètre (suivi)

- **Câblage frontend** : `GaragePage.tsx` / `AlertePage.tsx` consomment encore des données démo en dur. Brancher ces pages sur `/api/garage*` est un chantier frontend distinct (nouveau spec/plan).
- **Seed** : pour tester en local, il faut au moins un `TyreModel` en base (table `tyre_models`) avec un `globalId` connu et un compte Strava possédant des vélos (`bikes`).
- Météo/style ne pèsent **pas** dans le chiffre d'usure (uniquement dans `explanation`), conformément au spec.
