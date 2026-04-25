import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async topRated(limit = 25) {
    return this.prisma.user.findMany({
      where: { gamesPlayed: { gt: 0 } },
      orderBy: { rating: 'desc' },
      take: limit,
      select: { id: true, username: true, rating: true, gamesPlayed: true, wins: true, losses: true, draws: true },
    });
  }

  recentGames(userId: string, limit = 20) {
    return this.prisma.game.findMany({
      where: { OR: [{ whiteId: userId }, { blackId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        whiteId: true,
        blackId: true,
        status: true,
        endReason: true,
        createdAt: true,
        finishedAt: true,
        white: { select: { username: true, rating: true } },
        black: { select: { username: true, rating: true } },
      },
    });
  }
}
