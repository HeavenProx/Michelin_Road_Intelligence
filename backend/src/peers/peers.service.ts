import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, IsNull, Repository } from 'typeorm';
import { Review } from '../avis/review.entity';
import { ProfileSnapshot } from '../profile/profile-snapshot.entity';
import { ProfileService } from '../profile/profile.service';
import type { RiderProfile } from '../profile/profile.types';
import type { User } from '../users/user.entity';

interface PeerProfile {
  terrain_label: string;
  monthly_distance: number;
  avg_elevation_m: number;
  rain_percentage: number;
}

interface PeerFixture {
  profile: PeerProfile;
  name: string;
  location: string;
  km: number;
  totalKm: number;
  rating: number;
  review: string;
  tire: string;
  rides: number;
  terrainDisplay: string;
  date: string;
}

export interface PeerDto {
  name: string;
  location: string;
  km: number;
  totalKm: number;
  rating: number;
  review: string;
  similarity: number;
  tire: string;
  rides: number;
  terrain: string;
  date: string;
}

const PEER_POOL: PeerFixture[] = [
  {
    profile: {
      terrain_label: 'Montagne',
      monthly_distance: 320,
      avg_elevation_m: 1420,
      rain_percentage: 38,
    },
    name: 'Élodie M.',
    location: 'Annecy, Haute-Savoie',
    km: 2840,
    totalKm: 8420,
    rating: 5,
    review:
      "Grip incroyable même sous la pluie en descente du Galibier. Je ne m'attendais pas à autant de confiance sur le mouillé.",
    tire: 'Power All Season TLR',
    rides: 52,
    terrainDisplay: 'Montagne 58%',
    date: '12 avril 2026',
  },
  {
    profile: {
      terrain_label: 'Montagne',
      monthly_distance: 410,
      avg_elevation_m: 1180,
      rain_percentage: 29,
    },
    name: 'Marc-Antoine D.',
    location: 'Lyon, Rhône',
    km: 4100,
    totalKm: 12300,
    rating: 4,
    review:
      '4 000 km et la bande de roulement est encore très correcte. Un peu cher mais ça vaut le coup sur la durée.',
    tire: 'Power All Season TLR',
    rides: 44,
    terrainDisplay: 'Montagne 49%',
    date: '28 mars 2026',
  },
  {
    profile: {
      terrain_label: 'Montagne',
      monthly_distance: 260,
      avg_elevation_m: 980,
      rain_percentage: 41,
    },
    name: 'Lucie B.',
    location: 'Chambéry, Savoie',
    km: 1920,
    totalKm: 5760,
    rating: 5,
    review:
      'Je roulais avec une autre marque avant. La différence se sent immédiatement dans les virages mouillés.',
    tire: 'Power All Season TLR',
    rides: 61,
    terrainDisplay: 'Montagne 45%',
    date: '2 mai 2026',
  },
  {
    profile: {
      terrain_label: 'Plaine',
      monthly_distance: 480,
      avg_elevation_m: 120,
      rain_percentage: 22,
    },
    name: 'Thomas R.',
    location: 'Bordeaux, Gironde',
    km: 3600,
    totalKm: 18500,
    rating: 4,
    review:
      'Parfait pour mes sorties route en Gironde. Roulement très silencieux et longévité au rendez-vous.',
    tire: 'Power Road TLR',
    rides: 67,
    terrainDisplay: 'Plaine 82%',
    date: '5 mai 2026',
  },
  {
    profile: {
      terrain_label: 'Plaine',
      monthly_distance: 310,
      avg_elevation_m: 85,
      rain_percentage: 18,
    },
    name: 'Camille D.',
    location: 'Nantes, Loire-Atlantique',
    km: 2100,
    totalKm: 7200,
    rating: 5,
    review:
      'Mon premier pneu Michelin après des années sur Continental. Clairement meilleur sur chaussée humide.',
    tire: 'Power Road TLR',
    rides: 38,
    terrainDisplay: 'Plaine 77%',
    date: '18 avril 2026',
  },
  {
    profile: {
      terrain_label: 'Plaine',
      monthly_distance: 620,
      avg_elevation_m: 95,
      rain_percentage: 31,
    },
    name: 'Julien P.',
    location: 'Strasbourg, Bas-Rhin',
    km: 5200,
    totalKm: 22000,
    rating: 4,
    review:
      'Je fais beaucoup de km en toutes conditions. Ce pneu tient la route même par mauvais temps alsacien.',
    tire: 'Power All Season TLR',
    rides: 89,
    terrainDisplay: 'Plaine 74%',
    date: '10 mars 2026',
  },
  {
    profile: {
      terrain_label: 'Mixte',
      monthly_distance: 350,
      avg_elevation_m: 540,
      rain_percentage: 35,
    },
    name: 'Sophie L.',
    location: 'Clermont-Ferrand, Puy-de-Dôme',
    km: 3100,
    totalKm: 9800,
    rating: 5,
    review:
      "Parfait pour l'Auvergne : un peu de tout, du plat, du col. Le pneu s'adapte à tout sans compromis.",
    tire: 'Power Endurance+',
    rides: 55,
    terrainDisplay: 'Mixte 51%',
    date: '22 avril 2026',
  },
  {
    profile: {
      terrain_label: 'Mixte',
      monthly_distance: 280,
      avg_elevation_m: 420,
      rain_percentage: 44,
    },
    name: 'Kevin M.',
    location: 'Rennes, Ille-et-Vilaine',
    km: 1650,
    totalKm: 4900,
    rating: 4,
    review:
      "La Bretagne c'est pluie garantie. Ce pneu ne m'a jamais déçu même sur les petites routes mouillées.",
    tire: 'Power All Season TLR',
    rides: 29,
    terrainDisplay: 'Mixte 40%',
    date: '30 avril 2026',
  },
  {
    profile: {
      terrain_label: 'Montagne',
      monthly_distance: 550,
      avg_elevation_m: 1850,
      rain_percentage: 25,
    },
    name: 'Antoine V.',
    location: 'Grenoble, Isère',
    km: 6200,
    totalKm: 24000,
    rating: 5,
    review:
      "Col du Glandon, Alpe d'Huez, Croix de Fer : ce pneu encaisse tout. Le grip en descente est exceptionnel.",
    tire: 'Power Climber TLR',
    rides: 73,
    terrainDisplay: 'Montagne 71%',
    date: '1 juin 2026',
  },
  {
    profile: {
      terrain_label: 'Mixte',
      monthly_distance: 190,
      avg_elevation_m: 310,
      rain_percentage: 48,
    },
    name: 'Marie-Claire F.',
    location: 'Rouen, Seine-Maritime',
    km: 1200,
    totalKm: 3400,
    rating: 4,
    review:
      "Je suis cycliste du dimanche mais j'attendais mieux côté confort. La sécurité par contre, top.",
    tire: 'Power All Season TLR',
    rides: 22,
    terrainDisplay: 'Mixte 38%',
    date: '14 mai 2026',
  },
];

const DEMO_PROFILE: RiderProfile = {
  ride_count: 48,
  total_distance_km: 2340,
  monthly_distance: 195,
  monthly_elevation_m: 1850,
  avg_speed_kmh: 24,
  avg_elevation_m: 312,
  terrain_label: 'Mixte',
  style_label: 'Randonneur',
  weather_exposure: { rain_percentage: 28, rainy_rides: 13 },
  region: 'Île-de-France',
};

@Injectable()
export class PeersService {
  constructor(
    private readonly profileService: ProfileService,
    @InjectRepository(ProfileSnapshot)
    private readonly snapshots: Repository<ProfileSnapshot>,
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
  ) {}

  getDemoPeers(): PeerDto[] {
    return this.matchFromFixtures(DEMO_PROFILE, 3);
  }

  async getPeers(user: User): Promise<PeerDto[]> {
    const profile = await this.profileService.getProfile(user);

    const realPeers = await this.buildRealPeers(user.id, profile);

    const needed = 3 - realPeers.length;
    const fixtures = needed > 0 ? this.matchFromFixtures(profile, needed) : [];

    return [...realPeers, ...fixtures];
  }

  /** Construit les pairs depuis les vrais utilisateurs en base. */
  private async buildRealPeers(
    currentUserId: number,
    profile: RiderProfile,
  ): Promise<PeerDto[]> {
    const userReviews = await this.reviews.find({
      where: { userId: Not(IsNull()) },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    // Une seule review par utilisateur (la plus récente), excluant l'utilisateur courant
    const byUser = new Map<number, Review>();
    for (const r of userReviews) {
      if (r.userId === currentUserId) continue;
      if (!byUser.has(r.userId!)) byUser.set(r.userId!, r);
    }

    const candidates: { peer: PeerDto; similarity: number }[] = [];

    for (const [userId, review] of byUser) {
      const snapshot = await this.snapshots.findOne({ where: { userId } });
      if (!snapshot) continue;

      const peerProfile = JSON.parse(snapshot.profile) as RiderProfile;
      const similarity = this.computeSimilarity(profile, {
        terrain_label: peerProfile.terrain_label,
        monthly_distance: peerProfile.monthly_distance,
        avg_elevation_m: peerProfile.avg_elevation_m,
        rain_percentage: peerProfile.weather_exposure.rain_percentage,
      });

      const name = this.anonymizeName(review.user, review.authorName);
      const location = review.user?.city
        ? `${review.user.city}, France`
        : review.authorLocation;

      candidates.push({
        similarity,
        peer: {
          name,
          location,
          km: review.kmAtReview,
          totalKm: review.totalKm,
          rating: review.rating,
          review: review.comment,
          similarity,
          tire: review.tyreName,
          rides: peerProfile.ride_count,
          terrain: peerProfile.terrain_label,
          date: review.createdAt.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        },
      });
    }

    candidates.sort((a, b) => b.similarity - a.similarity);
    return candidates.slice(0, 3).map((c) => c.peer);
  }

  /** Sélectionne les N fixtures les plus similaires au profil donné. */
  private matchFromFixtures(profile: RiderProfile, n: number): PeerDto[] {
    const scored = PEER_POOL.map((peer) => ({
      ...peer,
      similarity: this.computeSimilarity(profile, peer.profile),
    }));
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, n).map((peer) => ({
      name: peer.name,
      location: peer.location,
      km: peer.km,
      totalKm: peer.totalKm,
      rating: peer.rating,
      review: peer.review,
      similarity: peer.similarity,
      tire: peer.tire,
      rides: peer.rides,
      terrain: peer.terrainDisplay,
      date: peer.date,
    }));
  }

  private computeSimilarity(user: RiderProfile, peer: PeerProfile): number {
    const terrainScore = user.terrain_label === peer.terrain_label ? 100 : 30;

    const distDiff = Math.abs(user.monthly_distance - peer.monthly_distance);
    const distScore = Math.max(0, 100 - (distDiff / 800) * 100);

    const elevDiff = Math.abs(user.avg_elevation_m - peer.avg_elevation_m);
    const elevScore = Math.max(0, 100 - (elevDiff / 2000) * 100);

    const rainDiff = Math.abs(
      user.weather_exposure.rain_percentage - peer.rain_percentage,
    );
    const rainScore = Math.max(0, 100 - (rainDiff / 60) * 100);

    return Math.round(
      terrainScore * 0.4 +
        distScore * 0.25 +
        elevScore * 0.25 +
        rainScore * 0.1,
    );
  }

  private anonymizeName(user: User | null, fallback: string): string {
    if (user) {
      const initial = user.lastname?.[0] ?? '';
      return `${user.firstname} ${initial}.`.trim();
    }
    return fallback;
  }
}
