import { Module } from '@nestjs/common';
import { EngineService } from './engine.service';
import { EngineController } from './engine.controller';

@Module({
  providers: [EngineService],
  controllers: [EngineController],
  exports: [EngineService],
})
export class EngineModule {}
