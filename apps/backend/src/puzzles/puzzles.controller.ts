import { Body, Controller, Get, Headers, Post, Query, UnauthorizedException } from '@nestjs/common';
import { IsBoolean, IsString } from 'class-validator';
import { PuzzlesService } from './puzzles.service';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

class AttemptDto {
  @IsString()
  puzzleId!: string;
  @IsBoolean()
  success!: boolean;
}

@Controller('puzzles')
export class PuzzlesController {
  constructor(
    private readonly puzzles: PuzzlesService,
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('random')
  async random(
    @Query('rating') rating?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    let target = Number(rating) || 1200;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const p = this.auth.verify(authHeader.slice(7));
        const u = await this.prisma.user.findUnique({ where: { id: p.sub } });
        if (u) target = u.puzzleRating;
      } catch { /* ignore */ }
    }
    return this.puzzles.random(target);
  }

  @Post('attempt')
  async attempt(@Body() body: AttemptDto, @Headers('authorization') authHeader?: string) {
    let userId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        userId = this.auth.verify(authHeader.slice(7)).sub;
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    }
    return this.puzzles.recordAttempt(userId, body.puzzleId, body.success);
  }
}
