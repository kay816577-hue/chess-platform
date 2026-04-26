import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SEED_PUZZLES } from './puzzle-seed';

export interface PuzzleView {
  id: string;
  fen: string;
  // First move of the solution, which is the opponent's move the user will see
  // applied before they respond.
  firstMove: string;
  solution: string[]; // full UCI move list (opponent + solver moves interleaved)
  rating: number;
  themes: string[];
}

@Injectable()
export class PuzzlesService {
  private readonly logger = new Logger(PuzzlesService.name);

  constructor(private readonly prisma: PrismaService) {
    void this.seedIfEmpty();
  }

  private async seedIfEmpty() {
    try {
      const count = await this.prisma.puzzle.count();
      if (count > 0) return;
      await this.prisma.puzzle.createMany({
        data: SEED_PUZZLES.map((p) => ({
          id: p.id,
          fen: p.fen,
          solution: p.solution,
          rating: p.rating,
          themes: p.themes,
        })),
        skipDuplicates: true,
      });
      this.logger.log(`Seeded ${SEED_PUZZLES.length} puzzles.`);
    } catch (err) {
      this.logger.warn(`Puzzle seed skipped: ${(err as Error).message}`);
    }
  }

  async random(targetRating: number): Promise<PuzzleView> {
    // Pick puzzles within ±200 of targetRating, fall back to closest 50.
    const near = await this.prisma.puzzle.findMany({
      where: {
        rating: { gte: targetRating - 200, lte: targetRating + 200 },
      },
      take: 50,
    });
    const pool = near.length > 0 ? near : await this.prisma.puzzle.findMany({ take: 50 });
    if (pool.length === 0) throw new NotFoundException('No puzzles available');
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const solution = pick.solution.split(/\s+/).filter(Boolean);
    return {
      id: pick.id,
      fen: pick.fen,
      firstMove: solution[0],
      solution,
      rating: pick.rating,
      themes: pick.themes ? pick.themes.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
  }

  async recordAttempt(userId: string | null, puzzleId: string, success: boolean) {
    if (!userId) return { rating: 1200 };
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      const puzzle = await tx.puzzle.findUnique({ where: { id: puzzleId } });
      if (!puzzle) throw new NotFoundException('Puzzle not found');

      // Glicko-lite: k=24, expected score via Elo formula.
      const k = 24;
      const diff = puzzle.rating - user.puzzleRating;
      const expected = 1 / (1 + Math.pow(10, diff / 400));
      const actual = success ? 1 : 0;
      const delta = Math.round(k * (actual - expected));
      const nextUserRating = Math.max(100, user.puzzleRating + delta);
      // Inverse change on puzzle rating for a tiny self-correcting signal.
      const puzzleDelta = Math.round(k * 0.1 * (expected - actual));
      const nextPuzzleRating = Math.max(400, Math.min(2800, puzzle.rating + puzzleDelta));

      await tx.user.update({
        where: { id: userId },
        data: {
          puzzleRating: nextUserRating,
          puzzlesSolved: { increment: success ? 1 : 0 },
        },
      });
      await tx.puzzle.update({
        where: { id: puzzleId },
        data: {
          rating: nextPuzzleRating,
          popularity: { increment: 1 },
        },
      });
      await tx.puzzleAttempt.create({
        data: {
          userId,
          puzzleId,
          success,
          ratingBefore: user.puzzleRating,
          ratingAfter: nextUserRating,
        },
      });
      return { rating: nextUserRating, delta };
    });
  }
}
