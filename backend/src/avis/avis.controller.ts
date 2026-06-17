import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { AvisService } from './avis.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('api')
export class AvisController {
  constructor(private readonly avis: AvisService) {}

  /** Lecture publique : alimente la page Avis (réelle + démo) sans auth. */
  @Get('reviews')
  list(@Query('tire') tire?: string) {
    return this.avis.listReviews(tire);
  }

  /** Soumission : auth requise, aucune condition de kilométrage. */
  @Post('reviews')
  @UseGuards(AuthenticatedGuard)
  create(@Req() req: Request, @Body() dto: CreateReviewDto) {
    if (!req.user) throw new UnauthorizedException();
    return this.avis.createReview(req.user, dto);
  }
}
