import { Module } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { QueueStore } from './queue-store';

@Module({
  providers: [MatchmakingService, QueueStore],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
