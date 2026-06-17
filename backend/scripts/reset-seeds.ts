/**
 * Supprime toutes les données seedées (pairs fictifs + avis anonymes)
 * pour permettre un re-seed propre.
 * Usage : cd backend && pnpm reset:seeds
 */
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual } from 'typeorm';
import type { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Review } from '../src/avis/review.entity';
import { User } from '../src/users/user.entity';

const SEED_STRAVA_ID_MIN = 9_000_000;

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const users = app.get<Repository<User>>(getRepositoryToken(User));
  const reviews = app.get<Repository<Review>>(getRepositoryToken(Review));

  // Avis liés aux users fictifs
  const fakeUsers = await users.find({
    where: { stravaId: MoreThanOrEqual(SEED_STRAVA_ID_MIN) },
    select: ['id'],
  });
  const fakeUserIds = fakeUsers.map((u) => u.id);

  if (fakeUserIds.length > 0) {
    for (const userId of fakeUserIds) {
      await reviews.delete({ userId });
    }
    await users.delete(fakeUsers.map((u) => ({ id: u.id })));
    console.log(`${fakeUserIds.length} utilisateurs fictifs supprimés.`);
  }

  // Avis anonymes (seed-reviews)
  const deleted = await reviews.delete({ userId: IsNull() });
  console.log(`${deleted.affected ?? 0} avis anonymes supprimés.`);

  await app.close();
}

void main();
