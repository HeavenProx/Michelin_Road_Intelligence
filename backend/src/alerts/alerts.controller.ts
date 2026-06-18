import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { AlertsService } from './alerts.service';

@Controller('api/alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  @UseGuards(AuthenticatedGuard)
  getAlerts(@Req() req: Request) {
    return this.alerts.getAlerts(req.user!);
  }
}
