import { Module } from '@nestjs/common';
import { PlayGateway } from './play.gateway';
import { AuthModule } from '../auth/auth.module';
import { GamesModule } from '../games/games.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { EngineModule } from '../engine/engine.module';

@Module({
  imports: [AuthModule, GamesModule, MatchmakingModule, EngineModule],
  providers: [PlayGateway],
})
export class GatewayModule {}
