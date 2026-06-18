/// <reference types="jest" />
import type { Repository } from 'typeorm';
import type { ProfileService } from '../profile/profile.service';
import { TyreModel } from '../tyres/tyre-model.entity';
import type { User } from '../users/user.entity';
import { RecommendService } from './recommend.service';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeTyre(overrides: Partial<TyreModel> = {}): TyreModel {
  return Object.assign(new TyreModel(), {
    id: 1,
    globalId: 'test-1',
    rangeName: 'POWER',
    modelName: 'POWER TEST',
    segment: 'ENDURANCE',
    cycleType: 'ROAD',
    cycleTypeWeb: 'ROAD',
    bead: null,
    sealing: null,
    terrainTypes: 'ASPHALT',
    useType: 'ENDURANCE',
    rubberTechnologies: null,
    casingTechnologies: null,
    treadTechnologies: null,
    reinforcementTechnologies: null,
    sidewallType: null,
    fitting: null,
    availableWidthsMm: '[]',
    scoreWetGrip: 3,
    scoreRollingResistance: 3,
    scoreDurability: 3,
    scoreTerrainVersatility: 3,
    lifetimeKm: 5000,
    priceRange: '45–75€',
    ...overrides,
  } satisfies TyreModel);
}

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    ride_count: 20,
    total_distance_km: 800,
    monthly_distance: 200,
    monthly_elevation_m: 2000,
    avg_speed_kmh: 25,
    avg_elevation_m: 100,
    terrain_label: 'Plat',
    style_label: 'Loisir / polyvalent',
    weather_exposure: { rain_percentage: 10, rainy_rides: 2 },
    region: 'Lyon, France',
    ...overrides,
  };
}

function makeUser(): User {
  return {
    id: 1,
    stravaId: 99,
    firstname: 'Alice',
    lastname: 'M.',
    city: 'Lyon',
    state: null,
    country: 'France',
    profile: '',
    accessToken: 'tok',
    refreshToken: 'ref',
    tokenExpiresAt: 9_999_999_999,
  } as User;
}

function makeRepo(tyres: TyreModel[]): jest.Mocked<Repository<TyreModel>> {
  return {
    findBy: jest.fn().mockResolvedValue(tyres),
    find: jest.fn().mockResolvedValue(tyres),
  } as unknown as jest.Mocked<Repository<TyreModel>>;
}

function makeService(
  tyres: TyreModel[],
  profileOverrides: Record<string, unknown> = {},
): RecommendService {
  const profileSvc = {
    getProfile: jest.fn().mockResolvedValue(makeProfile(profileOverrides)),
  } as unknown as jest.Mocked<ProfileService>;
  return new RecommendService(makeRepo(tyres), profileSvc);
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('RecommendService', () => {
  describe('getDemoRecommendation', () => {
    it('retourne success=true avec le pneu démo et ses features', () => {
      const result = makeService([]).getDemoRecommendation();

      expect(result.success).toBe(true);
      expect(result.recommended.name).toBe('POWER ROAD');
      expect(result.recommended.features).toHaveLength(3);
    });
  });

  describe('getRecommendation — option refresh', () => {
    function makeServiceWithSpy(): {
      service: RecommendService;
      getProfile: jest.Mock;
    } {
      const getProfile = jest.fn().mockResolvedValue(makeProfile());
      const profileSvc = { getProfile } as unknown as ProfileService;
      return {
        service: new RecommendService(makeRepo([]), profileSvc),
        getProfile,
      };
    }

    it('propage refresh=true à getProfile', async () => {
      const { service, getProfile } = makeServiceWithSpy();
      await service.getRecommendation(makeUser(), true);
      expect(getProfile).toHaveBeenCalledWith(expect.anything(), {
        refresh: true,
      });
    });

    it('par défaut (sans argument) refresh=false', async () => {
      const { service, getProfile } = makeServiceWithSpy();
      await service.getRecommendation(makeUser());
      expect(getProfile).toHaveBeenCalledWith(expect.anything(), {
        refresh: false,
      });
    });
  });

  describe('getRecommendation — catalogue vide', () => {
    it('renvoie la réponse démo avec les infos du vrai athlète', async () => {
      const result = await makeService([]).getRecommendation(makeUser());

      expect(result.success).toBe(true);
      expect(result.athlete.firstname).toBe('Alice');
      expect(result.recommended.name).toBe('POWER ROAD');
    });
  });

  describe('getRecommendation — catalogue rempli', () => {
    it('retourne le pneu le mieux noté, success=true, et des features', async () => {
      const tyres = [
        makeTyre({
          modelName: 'A',
          scoreWetGrip: 5,
          scoreRollingResistance: 3,
          scoreDurability: 3,
          scoreTerrainVersatility: 3,
        }),
        makeTyre({
          id: 2,
          globalId: 'g2',
          modelName: 'B',
          scoreWetGrip: 2,
          scoreRollingResistance: 2,
          scoreDurability: 2,
          scoreTerrainVersatility: 2,
        }),
        makeTyre({
          id: 3,
          globalId: 'g3',
          modelName: 'C',
          scoreWetGrip: 3,
          scoreRollingResistance: 3,
          scoreDurability: 3,
          scoreTerrainVersatility: 3,
        }),
      ];
      const result = await makeService(tyres).getRecommendation(makeUser());

      expect(result.success).toBe(true);
      expect(result.recommended.match_score).toBeGreaterThanOrEqual(0);
      expect(result.recommended.match_score).toBeLessThanOrEqual(100);
      expect(result.recommended.features).toBeDefined();
      expect(Array.isArray(result.recommended.features)).toBe(true);
      expect(result.alternatives.length).toBeLessThanOrEqual(3);
    });

    it('profil pluvieux → pneu avec le meilleur wet_grip recommandé', async () => {
      // GRIP KING : top wet_grip, scores neutres sur le reste
      // DRY ROCKET : top rolling_resistance, wet_grip minimal — même baseline
      // Avec rain=80%, wet_grip pèse 1.7 vs rolling_resistance 1.0 → GRIP KING gagne
      const tyres = [
        makeTyre({
          modelName: 'GRIP KING',
          scoreWetGrip: 5,
          scoreRollingResistance: 3,
          scoreDurability: 3,
          scoreTerrainVersatility: 3,
        }),
        makeTyre({
          id: 2,
          globalId: 'g2',
          modelName: 'DRY ROCKET',
          scoreWetGrip: 1,
          scoreRollingResistance: 5,
          scoreDurability: 3,
          scoreTerrainVersatility: 3,
        }),
        makeTyre({
          id: 3,
          globalId: 'g3',
          modelName: 'NEUTRAL',
          scoreWetGrip: 3,
          scoreRollingResistance: 3,
          scoreDurability: 3,
          scoreTerrainVersatility: 3,
        }),
      ];
      const result = await makeService(tyres, {
        weather_exposure: { rain_percentage: 80, rainy_rides: 32 },
      }).getRecommendation(makeUser());

      expect(result.recommended.name).toBe('GRIP KING');
    });

    it('profil Performance → pneu avec le meilleur rolling_resistance recommandé', async () => {
      const tyres = [
        makeTyre({
          modelName: 'FAST ROLLER',
          scoreWetGrip: 2,
          scoreRollingResistance: 5,
          scoreDurability: 2,
          scoreTerrainVersatility: 2,
        }),
        makeTyre({
          id: 2,
          globalId: 'g2',
          modelName: 'GRIPPY',
          scoreWetGrip: 5,
          scoreRollingResistance: 1,
          scoreDurability: 3,
          scoreTerrainVersatility: 3,
        }),
        makeTyre({
          id: 3,
          globalId: 'g3',
          modelName: 'NEUTRAL',
          scoreWetGrip: 3,
          scoreRollingResistance: 3,
          scoreDurability: 3,
          scoreTerrainVersatility: 3,
        }),
      ];
      const result = await makeService(tyres, {
        style_label: 'Performance',
        weather_exposure: { rain_percentage: 5, rainy_rides: 1 },
      }).getRecommendation(makeUser());

      expect(result.recommended.name).toBe('FAST ROLLER');
    });

    it('terrain Montagne → pneu avec le meilleur terrain_versatility recommandé', async () => {
      const tyres = [
        makeTyre({
          modelName: 'MOUNTAIN KING',
          scoreWetGrip: 2,
          scoreRollingResistance: 2,
          scoreDurability: 2,
          scoreTerrainVersatility: 5,
        }),
        makeTyre({
          id: 2,
          globalId: 'g2',
          modelName: 'ROAD KING',
          scoreWetGrip: 4,
          scoreRollingResistance: 4,
          scoreDurability: 4,
          scoreTerrainVersatility: 1,
        }),
        makeTyre({
          id: 3,
          globalId: 'g3',
          modelName: 'NEUTRAL',
          scoreWetGrip: 3,
          scoreRollingResistance: 3,
          scoreDurability: 3,
          scoreTerrainVersatility: 3,
        }),
      ];
      const result = await makeService(tyres, {
        terrain_label: 'Montagne',
        weather_exposure: { rain_percentage: 5, rainy_rides: 1 },
      }).getRecommendation(makeUser());

      expect(result.recommended.name).toBe('MOUNTAIN KING');
    });

    it('déduplique les modèles : un seul résultat par nom de pneu', async () => {
      const tyres = [
        makeTyre({
          modelName: 'POWER ROAD',
          scoreWetGrip: 4,
          scoreRollingResistance: 4,
          scoreDurability: 3,
          scoreTerrainVersatility: 1,
        }),
        makeTyre({
          id: 2,
          globalId: 'g2',
          modelName: 'POWER ROAD',
          scoreWetGrip: 3,
          scoreRollingResistance: 4,
          scoreDurability: 3,
          scoreTerrainVersatility: 1,
        }),
        makeTyre({
          id: 3,
          globalId: 'g3',
          modelName: 'POWER ALL SEASON',
          scoreWetGrip: 4,
          scoreRollingResistance: 3,
          scoreDurability: 3,
          scoreTerrainVersatility: 1,
        }),
        makeTyre({
          id: 4,
          globalId: 'g4',
          modelName: 'POWER ENDURANCE',
          scoreWetGrip: 3,
          scoreRollingResistance: 3,
          scoreDurability: 5,
          scoreTerrainVersatility: 2,
        }),
      ];
      const result = await makeService(tyres).getRecommendation(makeUser());

      const allNames = [
        result.recommended.name,
        ...result.alternatives.map((a) => a.name),
      ];
      const uniqueNames = new Set(allNames);
      expect(uniqueNames.size).toBe(allNames.length);
    });
  });

  describe('generateFeatures (via getRecommendation)', () => {
    async function featuresFor(
      tyreOverrides: Partial<TyreModel>,
    ): Promise<string[]> {
      const tyre = makeTyre(tyreOverrides);
      const result = await makeService([
        tyre,
        makeTyre({ id: 2, globalId: 'g2', modelName: 'B' }),
        makeTyre({ id: 3, globalId: 'g3', modelName: 'C' }),
      ]).getRecommendation(makeUser());
      // On sait que "tyre" sera recommandé car il a les mêmes scores que les autres
      // (on ne teste que le contenu des features, pas l'ordre de recommandation)
      const allResults = [result.recommended, ...result.alternatives];
      const match = allResults.find((r) => r.name === tyre.modelName);
      return (
        (match as typeof result.recommended)?.features ??
        result.recommended.features
      );
    }

    it('détecte le compound GUM-X', async () => {
      const features = await featuresFor({ rubberTechnologies: 'GUM-X' });
      expect(features.some((f) => f.toLowerCase().includes('gum-x'))).toBe(
        true,
      );
    });

    it('détecte le compound MAGI-X', async () => {
      const features = await featuresFor({ rubberTechnologies: 'MAGI-X' });
      expect(features.some((f) => f.toLowerCase().includes('magi-x'))).toBe(
        true,
      );
    });

    it('détecte le casing ARAMID SHIELD', async () => {
      const features = await featuresFor({
        casingTechnologies: 'ARAMID SHIELD',
      });
      expect(features.some((f) => f.toLowerCase().includes('aramid'))).toBe(
        true,
      );
    });

    it('détecte le montage TLR via sealing TUBELESS READY', async () => {
      const features = await featuresFor({ sealing: 'TUBELESS READY' });
      expect(features.some((f) => f.toLowerCase().includes('tlr'))).toBe(true);
    });

    it('détecte le montage TLR via le nom du modèle', async () => {
      const features = await featuresFor({
        modelName: 'POWER ROAD TLR',
        sealing: null,
      });
      expect(features.some((f) => f.toLowerCase().includes('tlr'))).toBe(true);
    });

    it('retourne au moins une feature même sans données tech', async () => {
      const features = await featuresFor({
        rubberTechnologies: null,
        casingTechnologies: null,
        treadTechnologies: null,
        sealing: null,
      });
      expect(features.length).toBeGreaterThanOrEqual(1);
    });

    it('ne retourne jamais plus de 3 features', async () => {
      const features = await featuresFor({
        rubberTechnologies: 'GUM-X',
        casingTechnologies: 'BEAD TO BEAD SHIELD',
        treadTechnologies: 'HI-GRIP DESIGN',
        sealing: 'TUBELESS READY',
        modelName: 'POWER ALL SEASON TLR',
      });
      expect(features.length).toBeLessThanOrEqual(3);
    });
  });
});
