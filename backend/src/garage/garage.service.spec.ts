import type { Repository } from 'typeorm';
import type { StravaService } from '../strava/strava.service';
import type { ProfileService } from '../profile/profile.service';
import type { User } from '../users/user.entity';
import { Bike } from './bike.entity';
import { GarageTyre } from './garage-tyre.entity';
import type { TyreModel } from '../tyres/tyre-model.entity';
import { GarageService } from './garage.service';
import type { CyclingActivity } from '../strava/strava.types';

const user = { id: 7 } as User;

function makeService(
  over: {
    bikeRepo?: Partial<Repository<Bike>>;
    tyreRepo?: Partial<Repository<GarageTyre>>;
    modelRepo?: Partial<Repository<TyreModel>>;
    strava?: Partial<StravaService>;
    profile?: Partial<ProfileService>;
  } = {},
) {
  return new GarageService(
    (over.bikeRepo ?? {}) as Repository<Bike>,
    (over.tyreRepo ?? {}) as Repository<GarageTyre>,
    (over.modelRepo ?? {}) as Repository<TyreModel>,
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
        create: jest.fn((d) => Object.assign(new Bike(), d)),
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
