import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { StravaService } from './strava.service';

/**
 * Route de vérification (dev) : expose les activités vélo brutes récupérées.
 * Le profiler/recommender consommeront StravaService directement, pas cette route.
 */
@Controller('api/strava')
export class StravaController {
  constructor(private readonly stravaService: StravaService) {}

  @Get('activities')
  @UseGuards(AuthenticatedGuard)
  async activities(@Req() req: Request) {
    const user = req.session.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    const activities = await this.stravaService.getCyclingActivities(user);
    return { success: true, count: activities.length, activities };
  }
}
