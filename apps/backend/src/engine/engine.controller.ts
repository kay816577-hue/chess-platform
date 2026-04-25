import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { EngineService } from './engine.service';
import { Chess } from 'chess.js';
import type { AnalyzePgnRequest, AnalyzePgnResponse, EvaluatedMove } from '@chess/shared';

interface BestMoveDto {
  fen: string;
  depth?: number;
  movetime?: number;
  skill?: number;
}

function classify(delta: number): EvaluatedMove['classification'] {
  const d = Math.abs(delta);
  if (d >= 300) return 'blunder';
  if (d >= 150) return 'mistake';
  if (d >= 70) return 'inaccuracy';
  if (d >= 20) return 'good';
  return 'best';
}

@Controller('engine')
export class EngineController {
  constructor(private readonly engine: EngineService) {}

  @Post('bestmove')
  async bestmove(@Body() body: BestMoveDto) {
    if (!body?.fen) throw new BadRequestException('fen required');
    const depth = body.depth && body.depth > 0 ? Math.min(20, body.depth) : 12;
    const res = await this.engine.analyze({
      fen: body.fen,
      depth,
      movetime: body.movetime,
      skill: body.skill,
    });
    return res;
  }

  @Post('analyze')
  async analyze(@Body() body: AnalyzePgnRequest): Promise<AnalyzePgnResponse> {
    if (!body?.pgn) throw new BadRequestException('pgn required');
    const game = new Chess();
    try {
      game.loadPgn(body.pgn, { strict: false });
    } catch {
      throw new BadRequestException('invalid pgn');
    }
    const history = game.history({ verbose: true });
    const depth = body.depth && body.depth > 0 ? Math.min(16, body.depth) : 10;

    const replay = new Chess();
    const evaluated: EvaluatedMove[] = [];

    for (let i = 0; i < history.length; i++) {
      const fenBefore = replay.fen();
      const res = await this.engine.analyze({ fen: fenBefore, depth });
      // scoreBefore is from side-to-move perspective; convert to white-positive centipawns.
      const whiteScoreBefore = replay.turn() === 'w' ? res.score : -res.score;

      const move = history[i];
      replay.move({ from: move.from, to: move.to, promotion: move.promotion });

      // Evaluate after the move:
      const after = await this.engine.analyze({ fen: replay.fen(), depth });
      const whiteScoreAfter = replay.turn() === 'w' ? after.score : -after.score;

      const isWhite = move.color === 'w';
      const drop = isWhite ? whiteScoreBefore - whiteScoreAfter : whiteScoreAfter - whiteScoreBefore;

      evaluated.push({
        ply: i + 1,
        san: move.san,
        fen: replay.fen(),
        scoreBefore: whiteScoreBefore,
        scoreAfter: whiteScoreAfter,
        bestMove: res.bestMove ?? undefined,
        bestLine: res.pv?.slice(0, 5),
        classification: classify(drop),
      });
    }
    return { moves: evaluated, result: game.header().Result ?? '*' };
  }
}
