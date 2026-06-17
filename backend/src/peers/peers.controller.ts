import { Controller, Get } from '@nestjs/common';

@Controller('api/peers')
export class PeersController {
  @Get()
  getPeers() {
    return [
      {
        name: 'Élodie M.',
        location: 'Annecy, Haute-Savoie',
        km: 2840,
        totalKm: 8420,
        rating: 5,
        review:
          "Grip incroyable même sous la pluie en descente du Galibier. Je ne m'attendais pas à autant de confiance sur le mouillé.",
        similarity: 94,
        tire: 'Power All Season TLR',
        rides: 52,
        terrain: 'Montagne 58%',
        date: '12 avril 2026',
      },
      {
        name: 'Marc-Antoine D.',
        location: 'Lyon, Rhône',
        km: 4100,
        totalKm: 12300,
        rating: 4,
        review:
          '4 000 km et la bande de roulement est encore très correcte. Un peu cher mais ça vaut le coup sur la durée.',
        similarity: 89,
        tire: 'Power All Season TLR',
        rides: 44,
        terrain: 'Montagne 49%',
        date: '28 mars 2026',
      },
      {
        name: 'Lucie B.',
        location: 'Chambéry, Savoie',
        km: 1920,
        totalKm: 5760,
        rating: 5,
        review:
          'Je roulais avec une autre marque avant. La différence se sent immédiatement dans les virages mouillés.',
        similarity: 82,
        tire: 'Power All Season TLR',
        rides: 61,
        terrain: 'Montagne 45%',
        date: '2 mai 2026',
      },
    ];
  }
}
