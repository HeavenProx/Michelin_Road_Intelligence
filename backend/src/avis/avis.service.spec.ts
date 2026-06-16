/// <reference types="jest" />
import type { Repository } from 'typeorm';
import type { ProfileService } from '../profile/profile.service';
import type { StravaService } from '../strava/strava.service';
import type { User } from '../users/user.entity';
import { AvisService } from './avis.service';
import type { Review } from './review.entity';

function makeUser(): User {
  return {
    id: 7,
    firstname: 'Jean',
    lastname: 'Dupont',
    city: 'Lyon',
    state: 'Rhône',
  } as User;
}

describe('AvisService', () => {
  let service: AvisService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let strava: { kmRiddenSince: jest.Mock };
  let profile: { getProfile: jest.Mock };

  beforeEach(() => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    strava = { kmRiddenSince: jest.fn() };
    profile = { getProfile: jest.fn() };
    service = new AvisService(
      repo as unknown as Repository<Review>,
      strava as unknown as StravaService,
      profile as unknown as ProfileService,
    );
  });

  describe('listReviews', () => {
    it('mappe une review au shape front et privilégie les infos du User présent', async () => {
      repo.find.mockResolvedValue([
        {
          id: 1,
          user: {
            firstname: 'Élodie',
            lastname: 'Martin',
            city: 'Annecy',
            state: 'Haute-Savoie',
          },
          userId: 3,
          tyreName: 'Power Road',
          authorName: 'SNAPSHOT IGNORÉ',
          authorLocation: 'SNAPSHOT IGNORÉ',
          rating: 5,
          gripScore: 5,
          durabilityScore: 4,
          comfortScore: 5,
          punctureScore: 5,
          comment: 'Top',
          kmAtReview: 2840,
          totalKm: 8420,
          createdAt: new Date('2026-04-12T00:00:00Z'),
        },
      ]);

      const [dto] = await service.listReviews('Power Road');

      expect(dto).toEqual({
        id: 1,
        name: 'Élodie M.',
        location: 'Annecy, Haute-Savoie',
        tire: 'Power Road',
        km: 2840,
        totalKm: 8420,
        rating: 5,
        text: 'Top',
        date: '12 avril 2026',
        criteria: { grip: 5, durabilite: 4, confort: 5, anticrv: 5 },
      });
    });

    it('retombe sur le snapshot auteur quand user est null (avis démo)', async () => {
      repo.find.mockResolvedValue([
        {
          id: 2,
          user: null,
          userId: null,
          tyreName: 'Power Road',
          authorName: 'Kevin T.',
          authorLocation: 'Nice, Alpes-Maritimes',
          rating: 4,
          gripScore: 4,
          durabilityScore: 4,
          comfortScore: 4,
          punctureScore: 3,
          comment: 'Bien',
          kmAtReview: 2600,
          totalKm: 6200,
          createdAt: new Date('2026-02-14T00:00:00Z'),
        },
      ]);

      const [dto] = await service.listReviews();

      expect(dto.name).toBe('Kevin T.');
      expect(dto.location).toBe('Nice, Alpes-Maritimes');
    });
  });

  describe('createReview', () => {
    it(`calcule km/totalKm, snapshote l'auteur et sauvegarde`, async () => {
      strava.kmRiddenSince.mockResolvedValue(640);
      profile.getProfile.mockResolvedValue({ total_distance_km: 5120 });
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({});
      repo.save.mockImplementation((r: Review) =>
        Promise.resolve({ ...r, id: 99 }),
      );

      const dto = await service.createReview(makeUser(), {
        tire: 'Power Road',
        rating: 5,
        grip: 5,
        durabilite: 4,
        confort: 5,
        anticrv: 4,
        comment: 'Super pneu',
      });

      const saveCalls = repo.save.mock.calls as [Review, ...unknown[]][];
      const saved = saveCalls[0][0];
      expect(saved.userId).toBe(7);
      expect(saved.tyreName).toBe('Power Road');
      expect(saved.authorName).toBe('Jean D.');
      expect(saved.authorLocation).toBe('Lyon, Rhône');
      expect(saved.kmAtReview).toBe(640);
      expect(saved.totalKm).toBe(5120);
      expect(saved.gripScore).toBe(5);
      expect(saved.punctureScore).toBe(4);
      expect(dto.id).toBe(99);
      expect(dto.name).toBe('Jean D.');
    });

    it(`met à jour l'avis existant (upsert) au lieu d'en créer un second`, async () => {
      strava.kmRiddenSince.mockResolvedValue(100);
      profile.getProfile.mockResolvedValue({ total_distance_km: 1000 });
      repo.findOne.mockResolvedValue({ id: 42 });
      repo.save.mockImplementation((r: Review) => Promise.resolve(r));

      await service.createReview(makeUser(), {
        tire: 'Power Road',
        rating: 3,
        grip: 3,
        durabilite: 3,
        confort: 3,
        anticrv: 3,
        comment: 'Mise à jour',
      });

      expect(repo.create).not.toHaveBeenCalled();
      const upsertCalls = repo.save.mock.calls as [Review, ...unknown[]][];
      expect(upsertCalls[0][0].id).toBe(42);
    });
  });
});
