import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '../avis/review.entity';
import { AuthModule } from '../auth/auth.module';
import { ProfileSnapshot } from '../profile/profile-snapshot.entity';
import { ProfileModule } from '../profile/profile.module';
import { PeersController } from './peers.controller';
import { PeersService } from './peers.service';

@Module({
  imports: [
    AuthModule,
    ProfileModule,
    TypeOrmModule.forFeature([ProfileSnapshot, Review]),
  ],
  controllers: [PeersController],
  providers: [PeersService],
})
export class PeersModule {}
