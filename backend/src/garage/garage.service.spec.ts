import type { DeepPartial, ObjectLiteral, Repository } from 'typeorm';
import type { StravaService } from '../strava/strava.service';
import type { ProfileService } from '../profile/profile.service';
import type { User } from '../users/user.entity';
import { Bike } from './bike.entity';
import { GarageTyre } from './garage-tyre.entity';
import type { TyreModel } from '../tyres/tyre-model.entity';
import { GarageService } from './garage.service';
import type { CyclingActivity } from '../strava/strava.types';
import { NotFoundException } from '@nestjs/common';

const user = { id: 7 } as User;

// Les méthodes de Repository (create, save…) sont surchargées : un jest.fn()
// ne matche pas leur signature stricte. On mocke donc chaque méthode comme
// un jest.Mock, puis on cast vers le vrai type au moment de l'injection.
type MockRepo<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

function makeService(
  over: {
    bikeRepo?: MockRepo<Bike>;
    tyreRepo?: MockRepo<GarageTyre>;
    modelRepo?: MockRepo<TyreModel>;
    strava?: Partial<StravaService>;
    profile?: Partial<ProfileService>;
  } = {},
) {
  return new GarageService(
    (over.bikeRepo ?? {}) as unknown as Repository<Bike>,
    (over.tyreRepo ?? {}) as unknown as Repository<GarageTyre>,
    (over.modelRepo ?? {}) as unknown as Repository<TyreModel>,
    (over.strava ?? {}) as StravaService,
    (over.profile ?? {}) as ProfileService,
  );
}

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
      tyreModel: {
        modelName: 'POWER ROAD',
        lifetimeKm: 5000,
        priceRange: '45 – 58 €',
      },
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
      bikeRepo: {
        find: jest.fn().mockResolvedValue([bike]),
        create: jest.fn((d: DeepPartial<Bike>) => Object.assign(new Bike(), d)),
        save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
      },
      tyreRepo: { find: jest.fn().mockResolvedValue([tyre]) },
      strava: {
        getAthleteBikes: jest
          .fn()
          .mockResolvedValue([
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
    expect(garage.bikes[0].tyres[0].explanation).toMatch(/endurance/i);
  });
});

describe('GarageService.getGarage — dérivation du type de vélo', () => {
  it('dérive le type GRAVEL si activités majoritairement gravel', async () => {
    const bike = Object.assign(new Bike(), {
      id: 1,
      userId: 7,
      stravaGearId: 'b1',
      name: 'Checkpoint',
      type: 'ROAD',
      stravaDistanceKm: 800,
      lastSyncedAt: Date.now(),
    });
    const tyre = Object.assign(new GarageTyre(), {
      id: 10,
      bikeId: 1,
      position: 'FRONT',
      mountedDate: '2025-08-01',
      status: 'MOUNTED',
      tyreModel: {
        modelName: 'POWER GRAVEL',
        lifetimeKm: 6000,
        priceRange: '50 – 65 €',
      },
    });
    const gravelActivity = (n: number): CyclingActivity =>
      ({
        sportType: 'GravelRide',
        distanceKm: 40,
        startDate: `2025-09-0${n}T08:00:00Z`,
        trainer: false,
        manual: false,
        gearId: 'b1',
      }) as CyclingActivity;

    const bikeRepoSave = jest
      .fn()
      .mockImplementation((b) => Promise.resolve(b));
    const service = makeService({
      bikeRepo: {
        find: jest.fn().mockResolvedValue([bike]),
        create: jest.fn((d: DeepPartial<Bike>) => Object.assign(new Bike(), d)),
        save: bikeRepoSave,
      },
      tyreRepo: { find: jest.fn().mockResolvedValue([tyre]) },
      strava: {
        getAthleteBikes: jest.fn().mockResolvedValue([]),
        getCyclingActivities: jest
          .fn()
          .mockResolvedValue([gravelActivity(1), gravelActivity(2)]),
      },
      profile: {
        getProfile: jest.fn().mockResolvedValue({
          style_label: 'Aventure',
          weather_exposure: { rain_percentage: 10, rainy_rides: 1 },
        }),
      },
    });

    const garage = await service.getGarage(user);

    expect(garage.bikes[0].type).toBe('GRAVEL');
    expect(bikeRepoSave).toHaveBeenCalled();
  });
});

describe('GarageService.getGarage — sync paresseux (TTL)', () => {
  function makeGarageService(lastSyncedAt: number) {
    const bike = Object.assign(new Bike(), {
      id: 1,
      userId: 7,
      stravaGearId: 'b1',
      name: 'Tarmac',
      type: 'ROAD',
      stravaDistanceKm: 1000,
      lastSyncedAt,
    });
    const getAthleteBikes = jest
      .fn()
      .mockResolvedValue([
        { gearId: 'b1', name: 'Tarmac', distanceKm: 1000, primary: true },
      ]);
    const service = makeService({
      bikeRepo: {
        find: jest.fn().mockResolvedValue([bike]),
        create: jest.fn((d: DeepPartial<Bike>) => Object.assign(new Bike(), d)),
        save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
      },
      tyreRepo: { find: jest.fn().mockResolvedValue([]) },
      strava: {
        getAthleteBikes,
        getCyclingActivities: jest.fn().mockResolvedValue([]),
      },
      profile: {
        getProfile: jest.fn().mockResolvedValue({
          style_label: '',
          weather_exposure: { rain_percentage: 0, rainy_rides: 0 },
        }),
      },
    });
    return { service, getAthleteBikes };
  }

  it('ne re-synchronise pas si le bike est récent (lastSyncedAt frais)', async () => {
    const { service, getAthleteBikes } = makeGarageService(Date.now());
    await service.getGarage(user);
    expect(getAthleteBikes).not.toHaveBeenCalled();
  });

  it('re-synchronise si le bike est périmé (lastSyncedAt = 0)', async () => {
    const { service, getAthleteBikes } = makeGarageService(0);
    await service.getGarage(user);
    expect(getAthleteBikes).toHaveBeenCalled();
  });
});

describe('GarageService.getDemoGarage', () => {
  it('renvoie un jeu démo avec au moins un vélo et des pneus', () => {
    const demo = makeService().getDemoGarage();
    expect(demo.success).toBe(true);
    expect(demo.bikes.length).toBeGreaterThan(0);
    expect(demo.bikes[0].tyres.length).toBeGreaterThan(0);
    expect(demo.bikes[0].tyres[0].wear_percent).toBe(21);
    expect(demo.bikes[0].tyres[1].wear_percent).toBe(71);
  });
});

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
        create: jest.fn((d: DeepPartial<Bike>) => Object.assign(new Bike(), d)),
        save: jest.fn((b) => {
          saved.push(b as Bike);
          return Promise.resolve(b);
        }),
      },
    });

    const result = await service.syncBikes(user);

    expect(result).toHaveLength(2);
    expect(saved.find((b) => b.stravaGearId === 'b1')?.name).toBe('Tarmac');
    expect(saved.find((b) => b.stravaGearId === 'b2')?.name).toBe('Checkpoint');
  });
});

describe('GarageService.replaceTyre', () => {
  it("archive l'ancien pneu et monte le nouveau", async () => {
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
        create: jest.fn((d: DeepPartial<GarageTyre>) =>
          Object.assign(new GarageTyre(), d),
        ),
        save: jest.fn((t) => {
          saved.push(t as GarageTyre);
          return Promise.resolve(t);
        }),
      },
      modelRepo: {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 99, modelName: 'POWER ROAD' }),
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

describe('GarageService.setTyre', () => {
  const dto = {
    bikeId: 1,
    position: 'FRONT' as const,
    modelGlobalId: 'g-power-road',
    mountedDate: '2025-08-15',
  };

  it("crée un pneu monté quand aucun n'existe à cette position", async () => {
    const saved: GarageTyre[] = [];
    const service = makeService({
      bikeRepo: {
        findOne: jest
          .fn()
          .mockResolvedValue(Object.assign(new Bike(), { id: 1, userId: 7 })),
      },
      modelRepo: {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 99, modelName: 'POWER ROAD' }),
      },
      tyreRepo: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((d: DeepPartial<GarageTyre>) =>
          Object.assign(new GarageTyre(), d),
        ),
        save: jest.fn((t) => {
          saved.push(t as GarageTyre);
          return Promise.resolve(t);
        }),
      },
    });

    await service.setTyre(user, dto);

    expect(saved[0].bikeId).toBe(1);
    expect(saved[0].tyreModelId).toBe(99);
    expect(saved[0].status).toBe('MOUNTED');
  });

  it("rejette un vélo qui n'appartient pas à l'utilisateur", async () => {
    const service = makeService({
      bikeRepo: { findOne: jest.fn().mockResolvedValue(null) },
    });
    await expect(service.setTyre(user, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejette un modele de pneu introuvable', async () => {
    const service = makeService({
      bikeRepo: {
        findOne: jest
          .fn()
          .mockResolvedValue(Object.assign(new Bike(), { id: 1, userId: 7 })),
      },
      modelRepo: { findOne: jest.fn().mockResolvedValue(null) },
    });
    await expect(service.setTyre(user, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('met a jour le pneu monte existant a cette position', async () => {
    const existing = Object.assign(new GarageTyre(), {
      id: 42,
      bikeId: 1,
      position: 'FRONT',
      status: 'MOUNTED',
      tyreModelId: 1,
      mountedDate: '2025-01-01',
    });
    const created = jest.fn();
    const saved: GarageTyre[] = [];
    const service = makeService({
      bikeRepo: {
        findOne: jest
          .fn()
          .mockResolvedValue(Object.assign(new Bike(), { id: 1, userId: 7 })),
      },
      modelRepo: {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 99, modelName: 'POWER ROAD' }),
      },
      tyreRepo: {
        findOne: jest.fn().mockResolvedValue(existing),
        create: created,
        save: jest.fn((t) => {
          saved.push(t as GarageTyre);
          return Promise.resolve(t);
        }),
      },
    });
    await service.setTyre(user, dto);
    expect(created).not.toHaveBeenCalled();
    expect(saved[0].id).toBe(42);
    expect(saved[0].tyreModelId).toBe(99);
    expect(saved[0].mountedDate).toBe('2025-08-15');
  });
});
