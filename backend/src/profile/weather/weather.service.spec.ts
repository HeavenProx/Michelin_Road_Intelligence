import type { CyclingActivity } from '../../strava/strava.types';
import { WeatherService } from './weather.service';

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
    startDate: '2026-05-10T08:00:00Z',
    startDateLocal: '2026-05-10T10:00:00',
    startLatlng: [45.5, 3.1],
    trainer: false,
    commute: false,
    manual: false,
    gearId: null,
    ...overrides,
  };
}

/** Réponse Open-Meteo archive simulée pour une valeur de précipitation. */
function archiveResponse(precipitationSum: number | null) {
  return {
    ok: true,
    json: async () => ({
      daily: { time: ['2026-05-10'], precipitation_sum: [precipitationSum] },
    }),
  } as Response;
}

describe('WeatherService.getRainExposure', () => {
  let service: WeatherService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new WeatherService();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('ne fait aucun appel et renvoie {0,0} sans ride géolocalisé', async () => {
    const result = await service.getRainExposure([ride({ startLatlng: null })]);
    expect(result).toEqual({ rain_percentage: 0, rainy_rides: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('classe un jour comme pluvieux au-dessus de 1 mm', async () => {
    fetchMock.mockResolvedValueOnce(archiveResponse(2));
    const result = await service.getRainExposure([ride()]);
    expect(result).toEqual({ rain_percentage: 100, rainy_rides: 1 });
  });

  it('ne classe pas comme pluvieux à 1 mm ou moins', async () => {
    fetchMock.mockResolvedValueOnce(archiveResponse(0.5));
    const result = await service.getRainExposure([ride()]);
    expect(result).toEqual({ rain_percentage: 0, rainy_rides: 0 });
  });

  it('calcule le pourcentage sur l échantillon (1 pluvieux / 2)', async () => {
    fetchMock
      .mockResolvedValueOnce(archiveResponse(5)) // ride le plus récent
      .mockResolvedValueOnce(archiveResponse(0)); // ride plus ancien
    const rides = [
      ride({ startDateLocal: '2026-05-10T10:00:00', startDate: '2026-05-10T08:00:00Z' }),
      ride({ startDateLocal: '2026-05-01T10:00:00', startDate: '2026-05-01T08:00:00Z', startLatlng: [48.8, 2.3] }),
    ];
    const result = await service.getRainExposure(rides);
    expect(result).toEqual({ rain_percentage: 50, rainy_rides: 1 });
  });

  it('mutualise les appels pour des départs proches le même jour (cache)', async () => {
    fetchMock.mockResolvedValueOnce(archiveResponse(3));
    const rides = [
      ride({ startLatlng: [45.501, 3.101] }),
      ride({ startLatlng: [45.504, 3.104] }), // même clé à 2 décimales et même date
    ];
    const result = await service.getRainExposure(rides);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ rain_percentage: 100, rainy_rides: 2 });
  });

  it('exclut du dénominateur les jours sans donnée (latence archive)', async () => {
    fetchMock
      .mockResolvedValueOnce(archiveResponse(5)) // récent : pluvieux
      .mockResolvedValueOnce(archiveResponse(null)); // ancien : donnée absente → exclu
    const rides = [
      ride({ startDate: '2026-05-10T08:00:00Z', startLatlng: [45.5, 3.1] }),
      ride({ startDate: '2026-05-01T08:00:00Z', startLatlng: [48.8, 2.3] }),
    ];
    const result = await service.getRainExposure(rides);
    expect(result).toEqual({ rain_percentage: 100, rainy_rides: 1 });
  });

  it('traite une réponse HTTP en échec comme une donnée manquante', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const result = await service.getRainExposure([ride()]);
    expect(result).toEqual({ rain_percentage: 0, rainy_rides: 0 });
  });

  it('ne fait pas échouer la requête si fetch lève', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const result = await service.getRainExposure([ride()]);
    expect(result).toEqual({ rain_percentage: 0, rainy_rides: 0 });
  });
});
