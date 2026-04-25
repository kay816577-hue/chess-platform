import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { JwtGuard } from '../auth/jwt.guard';
import type { JwtPayload } from '../auth/auth.service';

interface CreateAiGameDto {
  level?: number;
  color?: 'white' | 'black' | 'random';
  initial?: number;
  increment?: number;
}

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.games.get(id);
  }

  @UseGuards(JwtGuard)
  @Post('ai')
  async createAi(@Req() req: { user: JwtPayload }, @Body() body: CreateAiGameDto) {
    const level = Math.max(0, Math.min(20, body.level ?? 8));
    const userPlaysWhite = body.color === 'white' ? true : body.color === 'black' ? false : Math.random() > 0.5;
    const initial = body.initial && body.initial > 0 ? body.initial : 600;
    const increment = body.increment && body.increment >= 0 ? body.increment : 0;
    return this.games.createAiGame({
      userId: req.user.sub,
      userPlaysWhite,
      aiLevel: level,
      timeControl: { initial, increment },
    });
  }
}
