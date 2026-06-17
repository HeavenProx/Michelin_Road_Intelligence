import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsNumber, IsString, Max, Min } from 'class-validator';
import { NotificationService } from './notification.service';

class WearAlertDto {
  @IsString()
  tire: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  wear: number;
}

@Controller('api')
export class NotificationController {
  constructor(private readonly notif: NotificationService) {}

  @Post('notify-wear')
  @HttpCode(200)
  async notifyWear(@Body() dto: WearAlertDto) {
    const sent = await this.notif.sendWearAlert(dto.tire, dto.wear);
    return { success: true, emailSent: sent };
  }
}
