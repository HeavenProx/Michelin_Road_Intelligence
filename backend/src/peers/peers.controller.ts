import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { PeersService } from './peers.service';

@Controller('api/peers')
export class PeersController {
  constructor(private readonly peersService: PeersService) {}

  @Get('demo')
  getDemoPeers() {
    return this.peersService.getDemoPeers();
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async getPeers(@Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    return this.peersService.getPeers(req.user);
  }
}
