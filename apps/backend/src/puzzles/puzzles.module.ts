import { Module } from '@nestjs/common';
import { PuzzlesController } from './puzzles.controller';
import { PuzzlesService } from './puzzles.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PuzzlesController],
  providers: [PuzzlesService],
})
export class PuzzlesModule {}
