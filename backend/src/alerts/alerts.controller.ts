import { Controller, Get } from '@nestjs/common';

@Controller('api/alerts')
export class AlertsController {
  @Get()
  getAlerts() {
    return {
      alerts: [
        { tire: 'Power All Season TLR', wear: 89, date: '15 juin 2026' },
        { tire: 'Pro4 Endurance', wear: 85, date: '10 mars 2026' },
        { tire: 'Lithion 3', wear: 92, date: '22 octobre 2025' },
      ],
      reminders: [
        {
          tire: 'Power All Season TLR',
          threshold: 2000,
          date: '10 juin 2026',
          done: false,
        },
        {
          tire: 'Power All Season TLR',
          threshold: 1000,
          date: '3 février 2026',
          done: true,
        },
        {
          tire: 'Power All Season TLR',
          threshold: 500,
          date: '12 novembre 2025',
          done: true,
        },
      ],
    };
  }
}
