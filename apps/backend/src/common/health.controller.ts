import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    let dbOk = false;
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }
    return { ok: dbOk, db: dbOk, ts: Date.now() };
  }

  @Get('healthz')
  healthz() {
    return { ok: true };
  }

  @Get('/')
  root() {
    return {
      name: 'chess-platform-api',
      status: 'ok',
      docs: 'https://github.com/kay816577-hue/chess-platform',
    };
  }
}
