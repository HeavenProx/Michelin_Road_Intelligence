import { Module } from '@nestjs/common';
import { PeersController } from './peers.controller';

@Module({ controllers: [PeersController] })
export class PeersModule {}
