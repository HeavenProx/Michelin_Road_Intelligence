"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const app_module_1 = require("../src/app.module");
const review_entity_1 = require("../src/avis/review.entity");
const SEED = [
    { authorName: 'Élodie M.', authorLocation: 'Annecy, Haute-Savoie', tyreName: 'Power All Season TLR', kmAtReview: 2840, totalKm: 8420, rating: 5, comment: "Grip incroyable même sous la pluie en descente du Galibier. Je ne m'attendais pas à autant de confiance sur le mouillé.", createdAt: '2026-04-12', grip: 5, durabilite: 4, confort: 5, anticrv: 5 },
    { authorName: 'Marc-Antoine D.', authorLocation: 'Lyon, Rhône', tyreName: 'Power All Season TLR', kmAtReview: 4100, totalKm: 12300, rating: 4, comment: "4 000 km et la bande de roulement est encore très correcte. Un peu cher mais ça vaut le coup sur la durée.", createdAt: '2026-03-28', grip: 4, durabilite: 5, confort: 4, anticrv: 4 },
    { authorName: 'Lucie B.', authorLocation: 'Chambéry, Savoie', tyreName: 'Power All Season TLR', kmAtReview: 1920, totalKm: 5760, rating: 5, comment: "Je roulais avec une autre marque avant. La différence se sent immédiatement dans les virages mouillés.", createdAt: '2026-05-02', grip: 5, durabilite: 4, confort: 5, anticrv: 5 },
    { authorName: 'Thomas G.', authorLocation: 'Lyon, Rhône', tyreName: 'Power All Season TLR', kmAtReview: 3800, totalKm: 9500, rating: 5, comment: "Mon pneu de référence depuis 2 saisons. Polyvalence remarquable, rien à redire.", createdAt: '2026-05-05', grip: 5, durabilite: 5, confort: 5, anticrv: 5 },
    { authorName: 'Kevin T.', authorLocation: 'Nice, Alpes-Maritimes', tyreName: 'Power Road', kmAtReview: 3200, totalKm: 7680, rating: 5, comment: "La résistance au roulement est vraiment faible, on gagne facilement 1–2 km/h sur le plat. Excellent en conditions sèches.", createdAt: '2026-04-18', grip: 5, durabilite: 4, confort: 4, anticrv: 4 },
    { authorName: 'Sébastien R.', authorLocation: 'Bordeaux, Gironde', tyreName: 'Power Road', kmAtReview: 2600, totalKm: 6200, rating: 4, comment: "Pneu très performant en conditions sèches. Un peu moins à l'aise sous la pluie mais reste très utilisable.", createdAt: '2026-02-14', grip: 4, durabilite: 4, confort: 4, anticrv: 3 },
    { authorName: 'Aurélie F.', authorLocation: 'Grenoble, Isère', tyreName: 'Pro4 Endurance', kmAtReview: 5200, totalKm: 11800, rating: 5, comment: "Impressionnant en termes de durabilité. Encore utilisable après 5 000 km, c'est incroyable.", createdAt: '2026-03-03', grip: 4, durabilite: 5, confort: 5, anticrv: 5 },
];
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn'],
    });
    const repo = app.get((0, typeorm_1.getRepositoryToken)(review_entity_1.Review));
    const count = await repo.count();
    if (count > 0) {
        console.log(`Table reviews déjà peuplée (${count} avis) — seed ignoré.`);
        await app.close();
        return;
    }
    const rows = SEED.map((s) => repo.create({
        user: null,
        userId: null,
        tyreName: s.tyreName,
        authorName: s.authorName,
        authorLocation: s.authorLocation,
        rating: s.rating,
        gripScore: s.grip,
        durabilityScore: s.durabilite,
        comfortScore: s.confort,
        punctureScore: s.anticrv,
        comment: s.comment,
        mountDate: new Date(s.createdAt),
        kmAtReview: s.kmAtReview,
        totalKm: s.totalKm,
        createdAt: new Date(s.createdAt),
    }));
    await repo.save(rows);
    console.log(`${rows.length} avis démo insérés.`);
    await app.close();
}
void main();
//# sourceMappingURL=seed-reviews.js.map