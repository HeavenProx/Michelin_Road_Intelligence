import type { CyclingActivity } from '../strava/strava.types';
import {
  avgElevationM,
  avgSpeedKmh,
  computeProfileStats,
  monthlyDistance,
  resolveRegion,
  rideCount,
  styleLabel,
  terrainLabel,
  totalDistanceKm,
} from './profile.stats';

/** Fabrique une activité vélo avec des valeurs par défaut surchargales. */
function ride(overrides: Partial<CyclingActivity> = {}): CyclingActivity {
  return {
    id: 1,
    name: 'Ride',
    sportType: 'Ride',
    distanceKm: 30,
    movingTimeS: 3600,
    elapsedTimeS: 3600,
    totalElevationGainM: 200,
    elevHighM: null,
    elevLowM: null,
    averageSpeedKmh: 30,
    maxSpeedKmh: 40,
    averageWatts: null,
    deviceWatts: false,
    startDate: '2026-01-01T08:00:00Z',
    startDateLocal: '2026-01-01T09:00:00',
    startLatlng: [45.5, 3.1],
    trainer: false,
    commute: false,
    manual: false,
    gearId: null,
    ...overrides,
  };
}

describe('rideCount', () => {
  it('renvoie 0 pour une liste vide', () => {
    expect(rideCount([])).toBe(0);
  });
  it('compte les activités', () => {
    expect(rideCount([ride(), ride(), ride()])).toBe(3);
  });
});

describe('totalDistanceKm', () => {
  it('somme les distances, arrondi 1 décimale', () => {
    expect(
      totalDistanceKm([
        ride({ distanceKm: 10.25 }),
        ride({ distanceKm: 5.05 }),
      ]),
    ).toBe(15.3);
  });
  it('renvoie 0 pour une liste vide', () => {
    expect(totalDistanceKm([])).toBe(0);
  });
});

describe('avgSpeedKmh', () => {
  it('est une moyenne pondérée par la distance (pas une moyenne de moyennes)', () => {
    // 30 km en 1 h + 60 km en 1 h = 90 km en 2 h = 45 km/h
    const a = ride({ distanceKm: 30, movingTimeS: 3600 });
    const b = ride({ distanceKm: 60, movingTimeS: 3600 });
    expect(avgSpeedKmh([a, b])).toBe(45);
  });
  it('détecte une régression vers une moyenne de moyennes (temps asymétriques)', () => {
    // 30 km en 1 h = 30 km/h ; 30 km en 2 h = 15 km/h
    // Pondéré : 60 km / 3 h = 20 km/h ; moyenne de moyennes : (30 + 15) / 2 = 22.5 km/h
    const a = ride({ distanceKm: 30, movingTimeS: 3600 });
    const b = ride({ distanceKm: 30, movingTimeS: 7200 });
    expect(avgSpeedKmh([a, b])).toBe(20);
  });
  it('renvoie 0 si le temps de mouvement total est nul', () => {
    expect(avgSpeedKmh([ride({ distanceKm: 10, movingTimeS: 0 })])).toBe(0);
  });
});

describe('avgElevationM', () => {
  it('moyenne le dénivelé par sortie, arrondi entier', () => {
    const rides = [
      ride({ totalElevationGainM: 100 }),
      ride({ totalElevationGainM: 200 }),
      ride({ totalElevationGainM: 300 }),
    ];
    expect(avgElevationM(rides)).toBe(200);
  });
  it('renvoie 0 pour une liste vide', () => {
    expect(avgElevationM([])).toBe(0);
  });
});

describe('monthlyDistance', () => {
  it('divise la distance totale par le nombre de mois couverts', () => {
    // 1er ride 2026-01-01, now 2026-03-02 → 60 jours → ceil(60/30)=2 mois → 300/2=150
    const rides = [
      ride({ distanceKm: 150, startDate: '2026-01-01T00:00:00Z' }),
      ride({ distanceKm: 150, startDate: '2026-02-15T00:00:00Z' }),
    ];
    expect(monthlyDistance(rides, new Date('2026-03-02T00:00:00Z'))).toBe(150);
  });
  it('garde un minimum de 1 mois pour un cycliste récent', () => {
    const rides = [ride({ distanceKm: 50, startDate: '2026-03-10T00:00:00Z' })];
    expect(monthlyDistance(rides, new Date('2026-03-20T00:00:00Z'))).toBe(50);
  });
  it('renvoie 0 pour une liste vide', () => {
    expect(monthlyDistance([], new Date('2026-03-20T00:00:00Z'))).toBe(0);
  });
});

describe('terrainLabel (densité de grimpe m/km)', () => {
  it('< 8 m/km → Plat', () => {
    expect(
      terrainLabel([ride({ distanceKm: 50, totalElevationGainM: 100 })]),
    ).toBe('Plat'); // 2
  });
  it('8 m/km (borne basse) → Mixte', () => {
    expect(
      terrainLabel([ride({ distanceKm: 50, totalElevationGainM: 400 })]),
    ).toBe('Mixte'); // 8
  });
  it('18 m/km (borne haute) → Mixte', () => {
    expect(
      terrainLabel([ride({ distanceKm: 50, totalElevationGainM: 900 })]),
    ).toBe('Mixte'); // 18
  });
  it('> 18 m/km → Montagne', () => {
    expect(
      terrainLabel([ride({ distanceKm: 50, totalElevationGainM: 1500 })]),
    ).toBe('Montagne'); // 30
  });
});

describe('styleLabel (échelle de priorité)', () => {
  it('VTT si le type dominant est MountainBikeRide', () => {
    const rides = [
      ride({ sportType: 'MountainBikeRide' }),
      ride({ sportType: 'MountainBikeRide' }),
      ride({ sportType: 'Ride' }),
    ];
    expect(styleLabel(rides)).toBe('VTT');
  });
  it('Gravel si le type dominant est GravelRide', () => {
    const rides = [
      ride({ sportType: 'GravelRide' }),
      ride({ sportType: 'GravelRide' }),
      ride({ sportType: 'Ride' }),
    ];
    expect(styleLabel(rides)).toBe('Gravel');
  });
  it('Performance sur route si vitesse moyenne ≥ 28 km/h', () => {
    const rides = [
      ride({ sportType: 'Ride', distanceKm: 30, movingTimeS: 3600 }),
    ]; // 30 km/h
    expect(styleLabel(rides)).toBe('Performance');
  });
  it('Endurance sur route si vitesse < 28 mais distance moyenne ≥ 60 km', () => {
    const rides = [
      ride({ sportType: 'Ride', distanceKm: 120, movingTimeS: 17280 }),
    ]; // 25 km/h, 120 km
    expect(styleLabel(rides)).toBe('Endurance');
  });
  it('Loisir / polyvalent sinon', () => {
    const rides = [
      ride({ sportType: 'Ride', distanceKm: 30, movingTimeS: 5400 }),
    ]; // 20 km/h, 30 km
    expect(styleLabel(rides)).toBe('Loisir / polyvalent');
  });
});

describe('resolveRegion', () => {
  it('combine ville et pays', () => {
    expect(
      resolveRegion({
        city: 'Clermont-Ferrand',
        state: null,
        country: 'France',
      }),
    ).toBe('Clermont-Ferrand, France');
  });
  it('utilise la région (state) si la ville est nulle', () => {
    expect(
      resolveRegion({ city: null, state: 'Auvergne', country: 'France' }),
    ).toBe('Auvergne, France');
  });
  it('renvoie une chaîne vide si tout est nul', () => {
    expect(resolveRegion({ city: null, state: null, country: null })).toBe('');
  });
});

describe('computeProfileStats', () => {
  const user = { city: 'Lyon', state: null, country: 'France' };

  it('renvoie des zéros et des labels neutres pour 0 activité', () => {
    const stats = computeProfileStats(
      [],
      user,
      new Date('2026-03-02T00:00:00Z'),
    );
    expect(stats).toEqual({
      ride_count: 0,
      total_distance_km: 0,
      monthly_distance: 0,
      avg_speed_kmh: 0,
      avg_elevation_m: 0,
      terrain_label: 'Données insuffisantes',
      style_label: 'Données insuffisantes',
      region: 'Lyon, France',
    });
  });

  it('assemble tous les agrégats pour un jeu non vide', () => {
    const rides = [
      ride({
        distanceKm: 30,
        movingTimeS: 3600,
        totalElevationGainM: 100,
        startDate: '2026-01-01T00:00:00Z',
        sportType: 'Ride',
      }),
      ride({
        distanceKm: 60,
        movingTimeS: 3600,
        totalElevationGainM: 500,
        startDate: '2026-02-01T00:00:00Z',
        sportType: 'Ride',
      }),
    ];
    const stats = computeProfileStats(
      rides,
      user,
      new Date('2026-03-02T00:00:00Z'),
    );
    expect(stats.ride_count).toBe(2);
    expect(stats.total_distance_km).toBe(90);
    expect(stats.avg_speed_kmh).toBe(45); // 90 km / 2 h
    expect(stats.avg_elevation_m).toBe(300); // (100+500)/2
    expect(stats.region).toBe('Lyon, France');
    expect(stats.terrain_label).toBe('Plat'); // 600/90 ≈ 6.7 m/km
    expect(stats.style_label).toBe('Performance'); // 45 km/h
  });
});
