import { AuthService } from '../auth/auth.service';
import type { SessionUser } from '../auth/auth.types';
import { StravaService } from './strava.service';
import type { StravaSummaryActivityRaw } from './strava.types';

function makeUser(): SessionUser {
  return {
    athlete: { id: 42 } as SessionUser['athlete'],
    accessToken: 'token-123',
    refreshToken: 'r',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };
}

function rawActivity(
  over: Partial<StravaSummaryActivityRaw>,
): StravaSummaryActivityRaw {
  return {
    id: 1,
    name: 'Sortie',
    sport_type: 'Ride',
    distance: 30_000,
    moving_time: 3600,
    elapsed_time: 3900,
    total_elevation_gain: 250,
    elev_high: 900,
    elev_low: 320,
    average_speed: 8.333, // m/s ≈ 30 km/h
    max_speed: 16.667, // m/s ≈ 60 km/h
    average_watts: 180,
    device_watts: true,
    start_date: '2026-05-01T08:00:00Z',
    start_date_local: '2026-05-01T10:00:00Z',
    start_latlng: [45.77, 3.08],
    trainer: false,
    commute: false,
    manual: false,
    gear_id: 'b123',
    ...over,
  };
}

function okJson(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('StravaService', () => {
  let service: StravaService;
  let authService: { getValidAccessToken: jest.Mock };

  beforeEach(() => {
    authService = {
      getValidAccessToken: jest.fn().mockResolvedValue('token-123'),
    };
    service = new StravaService(authService as unknown as AuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('demande un token valide avant d’appeler Strava', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(okJson([]));
    await service.getCyclingActivities(makeUser());
    expect(authService.getValidAccessToken).toHaveBeenCalledTimes(1);
  });

  it('ne garde que les activités vélo et normalise les unités', async () => {
    const page = [
      rawActivity({ id: 1, sport_type: 'Ride' }),
      rawActivity({ id: 2, sport_type: 'Run' }), // exclu
      rawActivity({ id: 3, sport_type: 'GravelRide' }),
    ];
    jest.spyOn(global, 'fetch').mockResolvedValue(okJson(page));

    const result = await service.getCyclingActivities(makeUser());

    expect(result.map((a) => a.id)).toEqual([1, 3]);
    expect(result[0]).toMatchObject({
      distanceKm: 30,
      averageSpeedKmh: 30,
      maxSpeedKmh: 60,
      totalElevationGainM: 250,
      elevHighM: 900,
      elevLowM: 320,
      averageWatts: 180,
      deviceWatts: true,
      elapsedTimeS: 3900,
      startDateLocal: '2026-05-01T10:00:00Z',
      startLatlng: [45.77, 3.08],
      gearId: 'b123',
      trainer: false,
      commute: false,
      manual: false,
    });
  });

  it('conserve les flags trainer/commute pour le filtrage en aval', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        okJson([rawActivity({ trainer: true, commute: true, gear_id: null })]),
      );

    const [activity] = await service.getCyclingActivities(makeUser());
    expect(activity.trainer).toBe(true);
    expect(activity.commute).toBe(true);
    expect(activity.gearId).toBeNull();
  });

  it('met start_latlng à null quand l’activité n’est pas géolocalisée', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(okJson([rawActivity({ start_latlng: [] })]));

    const [activity] = await service.getCyclingActivities(makeUser());
    expect(activity.startLatlng).toBeNull();
  });

  it('pagine jusqu’à une page incomplète', async () => {
    const fullPage = Array.from({ length: 200 }, (_, i) =>
      rawActivity({ id: i + 1 }),
    );
    const lastPage = [rawActivity({ id: 999 })];
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(okJson(fullPage))
      .mockResolvedValueOnce(okJson(lastPage));

    const result = await service.getCyclingActivities(makeUser(), {
      maxActivities: 1000,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(201);
  });

  it('lève une erreur en cas de rate limit (429)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Too Many Requests'),
    } as Response);

    await expect(service.getCyclingActivities(makeUser())).rejects.toThrow();
  });
});
