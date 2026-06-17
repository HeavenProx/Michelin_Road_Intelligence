import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { AuthService } from '../auth/auth.service';
import { StravaService } from './strava.service';

@Controller('api/strava')
export class StravaController {
  constructor(
    private readonly stravaService: StravaService,
    private readonly authService: AuthService,
  ) {}

  @Get('activities')
  @UseGuards(AuthenticatedGuard)
  async activities(@Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    const activities = await this.stravaService.getCyclingActivities(req.user);
    return { success: true, count: activities.length, activities };
  }

  /** Endpoint de debug : vélos bruts retournés par GET /athlete. */
  @Get('athlete')
  @UseGuards(AuthenticatedGuard)
  async athlete(@Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    const token = await this.authService.getValidAccessToken(req.user);
    const res = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as Record<string, unknown>;
    return {
      status: res.status,
      bikes: data['bikes'] ?? [],
      bikes_count: Array.isArray(data['bikes']) ? data['bikes'].length : 0,
      raw: data,
    };
  }

  /** Endpoint de debug : vélos normalisés via getAthleteBikes. */
  @Get('bikes')
  @UseGuards(AuthenticatedGuard)
  async bikes(@Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    const bikes = await this.stravaService.getAthleteBikes(req.user);
    return { success: true, count: bikes.length, bikes };
  }
}
