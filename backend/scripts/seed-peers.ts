/**
 * Seed de pairs fictifs : crée des utilisateurs, leurs snapshots de profil et leurs avis.
 * Ces données sont indiscernables de vrais utilisateurs côté API — elles alimentent
 * GET /api/peers dès le lancement, sans attendre une vraie masse critique.
 *
 * Usage : cd backend && pnpm seed:peers
 * Idempotent : identifié par stravaId > 9_000_000 (plage réservée aux seeds).
 */
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Review } from '../src/avis/review.entity';
import { ProfileSnapshot } from '../src/profile/profile-snapshot.entity';
import type { RiderProfile } from '../src/profile/profile.types';
import { User } from '../src/users/user.entity';

// ─── Données des pairs fictifs ───────────────────────────────────────────────

interface PeerSeed {
  stravaId: number;
  firstname: string;
  lastname: string;
  city: string;
  profile: RiderProfile;
  tyreName: string;
  kmAtReview: number;
  totalKm: number;
  rating: number;
  comment: string;
  gripScore: number;
  durabilityScore: number;
  comfortScore: number;
  punctureScore: number;
  reviewDate: string; // YYYY-MM-DD
}

const PEERS: PeerSeed[] = [
  {
    stravaId: 9_000_001,
    firstname: 'Élodie',
    lastname: 'Martin',
    city: 'Annecy',
    profile: {
      ride_count: 52,
      total_distance_km: 8420,
      monthly_distance: 320,
      monthly_elevation_m: 4800,
      avg_speed_kmh: 23,
      avg_elevation_m: 1420,
      terrain_label: 'Montagne',
      style_label: 'Grimpeur',
      weather_exposure: { rain_percentage: 38, rainy_rides: 20 },
      region: 'Auvergne-Rhône-Alpes',
    },
    tyreName: 'POWER ALL SEASON',
    kmAtReview: 2840,
    totalKm: 8420,
    rating: 5,
    comment:
      "Grip incroyable même sous la pluie en descente du Galibier. Je ne m'attendais pas à autant de confiance sur le mouillé.",
    gripScore: 5,
    durabilityScore: 4,
    comfortScore: 5,
    punctureScore: 5,
    reviewDate: '2026-04-12',
  },
  {
    stravaId: 9_000_002,
    firstname: 'Marc-Antoine',
    lastname: 'Dupont',
    city: 'Lyon',
    profile: {
      ride_count: 44,
      total_distance_km: 12300,
      monthly_distance: 410,
      monthly_elevation_m: 3500,
      avg_speed_kmh: 26,
      avg_elevation_m: 1180,
      terrain_label: 'Montagne',
      style_label: 'Endurance',
      weather_exposure: { rain_percentage: 29, rainy_rides: 13 },
      region: 'Auvergne-Rhône-Alpes',
    },
    tyreName: 'POWER ALL SEASON',
    kmAtReview: 4100,
    totalKm: 12300,
    rating: 4,
    comment:
      '4 000 km et la bande de roulement est encore très correcte. Un peu cher mais ça vaut le coup sur la durée.',
    gripScore: 4,
    durabilityScore: 5,
    comfortScore: 4,
    punctureScore: 4,
    reviewDate: '2026-03-28',
  },
  {
    stravaId: 9_000_003,
    firstname: 'Lucie',
    lastname: 'Bernard',
    city: 'Chambéry',
    profile: {
      ride_count: 61,
      total_distance_km: 5760,
      monthly_distance: 260,
      monthly_elevation_m: 3200,
      avg_speed_kmh: 21,
      avg_elevation_m: 980,
      terrain_label: 'Montagne',
      style_label: 'Randonneur',
      weather_exposure: { rain_percentage: 41, rainy_rides: 25 },
      region: 'Auvergne-Rhône-Alpes',
    },
    tyreName: 'POWER ALL SEASON',
    kmAtReview: 1920,
    totalKm: 5760,
    rating: 5,
    comment:
      'Je roulais avec une autre marque avant. La différence se sent immédiatement dans les virages mouillés.',
    gripScore: 5,
    durabilityScore: 4,
    comfortScore: 5,
    punctureScore: 5,
    reviewDate: '2026-05-02',
  },
  {
    stravaId: 9_000_004,
    firstname: 'Thomas',
    lastname: 'Renard',
    city: 'Bordeaux',
    profile: {
      ride_count: 67,
      total_distance_km: 18500,
      monthly_distance: 480,
      monthly_elevation_m: 800,
      avg_speed_kmh: 28,
      avg_elevation_m: 120,
      terrain_label: 'Plaine',
      style_label: 'Sportif',
      weather_exposure: { rain_percentage: 22, rainy_rides: 15 },
      region: 'Nouvelle-Aquitaine',
    },
    tyreName: 'POWER ROAD TLR',
    kmAtReview: 3600,
    totalKm: 18500,
    rating: 4,
    comment:
      'Parfait pour mes sorties route en Gironde. Roulement très silencieux et longévité au rendez-vous.',
    gripScore: 4,
    durabilityScore: 5,
    comfortScore: 4,
    punctureScore: 4,
    reviewDate: '2026-05-05',
  },
  {
    stravaId: 9_000_005,
    firstname: 'Camille',
    lastname: 'Dubois',
    city: 'Nantes',
    profile: {
      ride_count: 38,
      total_distance_km: 7200,
      monthly_distance: 310,
      monthly_elevation_m: 600,
      avg_speed_kmh: 24,
      avg_elevation_m: 85,
      terrain_label: 'Plaine',
      style_label: 'Randonneur',
      weather_exposure: { rain_percentage: 18, rainy_rides: 7 },
      region: 'Pays de la Loire',
    },
    tyreName: 'POWER ROAD TLR',
    kmAtReview: 2100,
    totalKm: 7200,
    rating: 5,
    comment:
      'Mon premier pneu Michelin après des années sur Continental. Clairement meilleur sur chaussée humide.',
    gripScore: 5,
    durabilityScore: 4,
    comfortScore: 5,
    punctureScore: 4,
    reviewDate: '2026-04-18',
  },
  {
    stravaId: 9_000_006,
    firstname: 'Julien',
    lastname: 'Petit',
    city: 'Strasbourg',
    profile: {
      ride_count: 89,
      total_distance_km: 22000,
      monthly_distance: 620,
      monthly_elevation_m: 1200,
      avg_speed_kmh: 27,
      avg_elevation_m: 95,
      terrain_label: 'Plaine',
      style_label: 'Compétiteur',
      weather_exposure: { rain_percentage: 31, rainy_rides: 27 },
      region: 'Grand Est',
    },
    tyreName: 'POWER ALL SEASON',
    kmAtReview: 5200,
    totalKm: 22000,
    rating: 4,
    comment:
      'Je fais beaucoup de km en toutes conditions. Ce pneu tient la route même par mauvais temps alsacien.',
    gripScore: 4,
    durabilityScore: 5,
    comfortScore: 4,
    punctureScore: 4,
    reviewDate: '2026-03-10',
  },
  {
    stravaId: 9_000_007,
    firstname: 'Sophie',
    lastname: 'Laurent',
    city: 'Clermont-Ferrand',
    profile: {
      ride_count: 55,
      total_distance_km: 9800,
      monthly_distance: 350,
      monthly_elevation_m: 2800,
      avg_speed_kmh: 22,
      avg_elevation_m: 540,
      terrain_label: 'Mixte',
      style_label: 'Randonneur',
      weather_exposure: { rain_percentage: 35, rainy_rides: 19 },
      region: 'Auvergne-Rhône-Alpes',
    },
    tyreName: 'PRO5',
    kmAtReview: 3100,
    totalKm: 9800,
    rating: 5,
    comment:
      "Parfait pour l'Auvergne : un peu de tout, du plat, du col. Le pneu s'adapte à tout sans compromis.",
    gripScore: 5,
    durabilityScore: 5,
    comfortScore: 5,
    punctureScore: 4,
    reviewDate: '2026-04-22',
  },
  {
    stravaId: 9_000_008,
    firstname: 'Kevin',
    lastname: 'Moreau',
    city: 'Rennes',
    profile: {
      ride_count: 29,
      total_distance_km: 4900,
      monthly_distance: 280,
      monthly_elevation_m: 1400,
      avg_speed_kmh: 20,
      avg_elevation_m: 420,
      terrain_label: 'Mixte',
      style_label: 'Loisir',
      weather_exposure: { rain_percentage: 44, rainy_rides: 13 },
      region: 'Bretagne',
    },
    tyreName: 'POWER ALL SEASON',
    kmAtReview: 1650,
    totalKm: 4900,
    rating: 4,
    comment:
      "La Bretagne c'est pluie garantie. Ce pneu ne m'a jamais déçu même sur les petites routes mouillées.",
    gripScore: 5,
    durabilityScore: 4,
    comfortScore: 4,
    punctureScore: 4,
    reviewDate: '2026-04-30',
  },
  {
    stravaId: 9_000_009,
    firstname: 'Antoine',
    lastname: 'Vincent',
    city: 'Grenoble',
    profile: {
      ride_count: 73,
      total_distance_km: 24000,
      monthly_distance: 550,
      monthly_elevation_m: 7200,
      avg_speed_kmh: 25,
      avg_elevation_m: 1850,
      terrain_label: 'Montagne',
      style_label: 'Grimpeur',
      weather_exposure: { rain_percentage: 25, rainy_rides: 18 },
      region: 'Auvergne-Rhône-Alpes',
    },
    tyreName: 'POWER CUP TLR',
    kmAtReview: 6200,
    totalKm: 24000,
    rating: 5,
    comment:
      "Col du Glandon, Alpe d'Huez, Croix de Fer : ce pneu encaisse tout. Le grip en descente est exceptionnel.",
    gripScore: 5,
    durabilityScore: 5,
    comfortScore: 4,
    punctureScore: 5,
    reviewDate: '2026-06-01',
  },
  {
    stravaId: 9_000_010,
    firstname: 'Marie-Claire',
    lastname: 'Fontaine',
    city: 'Rouen',
    profile: {
      ride_count: 22,
      total_distance_km: 3400,
      monthly_distance: 190,
      monthly_elevation_m: 900,
      avg_speed_kmh: 19,
      avg_elevation_m: 310,
      terrain_label: 'Mixte',
      style_label: 'Loisir',
      weather_exposure: { rain_percentage: 48, rainy_rides: 11 },
      region: 'Normandie',
    },
    tyreName: 'POWER ALL SEASON',
    kmAtReview: 1200,
    totalKm: 3400,
    rating: 4,
    comment:
      "Je suis cycliste du dimanche mais j'attendais mieux côté confort. La sécurité par contre, top.",
    gripScore: 4,
    durabilityScore: 4,
    comfortScore: 3,
    punctureScore: 4,
    reviewDate: '2026-05-14',
  },
];

// ─── Script ──────────────────────────────────────────────────────────────────

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const users = app.get<Repository<User>>(getRepositoryToken(User));
  const snapshots = app.get<Repository<ProfileSnapshot>>(
    getRepositoryToken(ProfileSnapshot),
  );
  const reviews = app.get<Repository<Review>>(getRepositoryToken(Review));

  const existing = await users.findOne({ where: { stravaId: 9_000_001 } });
  if (existing) {
    console.log('Pairs fictifs déjà présents — seed ignoré.');
    await app.close();
    return;
  }

  let inserted = 0;
  for (const peer of PEERS) {
    const user = await users.save(
      users.create({
        stravaId: peer.stravaId,
        firstname: peer.firstname,
        lastname: peer.lastname,
        city: peer.city,
        state: null,
        country: 'France',
        sex: null,
        profile: '',
        accessToken: 'seed',
        refreshToken: 'seed',
        tokenExpiresAt: 0,
      }),
    );

    await snapshots.save(
      snapshots.create({
        userId: user.id,
        profile: JSON.stringify(peer.profile),
        computedAt: Date.now(),
      }),
    );

    await reviews.save(
      reviews.create({
        userId: user.id,
        tyreName: peer.tyreName,
        authorName: `${peer.firstname} ${peer.lastname[0]}.`,
        authorLocation: `${peer.city}, France`,
        rating: peer.rating,
        gripScore: peer.gripScore,
        durabilityScore: peer.durabilityScore,
        comfortScore: peer.comfortScore,
        punctureScore: peer.punctureScore,
        comment: peer.comment,
        mountDate: new Date(peer.reviewDate),
        kmAtReview: peer.kmAtReview,
        totalKm: peer.totalKm,
      } as Partial<Review>),
    );

    inserted++;
  }

  console.log(
    `${inserted} pairs fictifs insérés (utilisateurs + snapshots + avis).`,
  );
  await app.close();
}

void main();
