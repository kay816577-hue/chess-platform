import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Chess } from 'chess.js';
import { PrismaService } from '../prisma/prisma.service';
import { EngineService } from '../engine/engine.service';
import { updateElo } from './elo';
import type {
  Color,
  GameEndReason,
  GameState,
  GameStatus,
  MovePayload,
  TimeControl,
} from '@chess/shared';

/** In-memory runtime state for an active game — cheap per-tick fields and the chess engine. */
interface RuntimeGame {
  chess: Chess;
  lastTickAt: number;
  whiteMs: number;
  blackMs: number;
  incrementMs: number;
  drawOfferedBy?: Color;
  endsAt?: number; // unused for now but reserved for flag timers
}

const AI_USER_ID = 'ai_stockfish';
const AI_USERNAME = 'StockfishAI';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);
  private runtime = new Map<string, RuntimeGame>();

  constructor(private readonly prisma: PrismaService, private readonly engine: EngineService) {}

  async ensureAiUser() {
    return this.prisma.user.upsert({
      where: { id: AI_USER_ID },
      update: {},
      create: { id: AI_USER_ID, username: AI_USERNAME, isGuest: false, rating: 2400 },
    });
  }

  async createHumanGame(params: {
    whiteId: string;
    blackId: string;
    timeControl: TimeControl;
  }) {
    const [white, black] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: params.whiteId } }),
      this.prisma.user.findUnique({ where: { id: params.blackId } }),
    ]);
    if (!white || !black) throw new NotFoundException('Player not found');

    const game = await this.prisma.game.create({
      data: {
        whiteId: white.id,
        blackId: black.id,
        initialTimeMs: params.timeControl.initial * 1000,
        incrementMs: params.timeControl.increment * 1000,
        whiteMs: params.timeControl.initial * 1000,
        blackMs: params.timeControl.initial * 1000,
        whiteRatingBefore: white.rating,
        blackRatingBefore: black.rating,
      },
      include: { white: true, black: true },
    });
    this.runtime.set(game.id, {
      chess: new Chess(),
      lastTickAt: Date.now(),
      whiteMs: game.whiteMs,
      blackMs: game.blackMs,
      incrementMs: game.incrementMs,
    });
    return this.toState(game.id);
  }

  async createAiGame(params: {
    userId: string;
    userPlaysWhite: boolean;
    aiLevel: number;
    timeControl: TimeControl;
  }) {
    const ai = await this.ensureAiUser();
    const user = await this.prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) throw new NotFoundException('User not found');
    const whiteId = params.userPlaysWhite ? user.id : ai.id;
    const blackId = params.userPlaysWhite ? ai.id : user.id;
    const whiteRating = params.userPlaysWhite ? user.rating : ai.rating;
    const blackRating = params.userPlaysWhite ? ai.rating : user.rating;
    const game = await this.prisma.game.create({
      data: {
        whiteId,
        blackId,
        initialTimeMs: params.timeControl.initial * 1000,
        incrementMs: params.timeControl.increment * 1000,
        whiteMs: params.timeControl.initial * 1000,
        blackMs: params.timeControl.initial * 1000,
        whiteRatingBefore: whiteRating,
        blackRatingBefore: blackRating,
        vsAi: true,
        aiLevel: params.aiLevel,
      },
      include: { white: true, black: true },
    });
    this.runtime.set(game.id, {
      chess: new Chess(),
      lastTickAt: Date.now(),
      whiteMs: game.whiteMs,
      blackMs: game.blackMs,
      incrementMs: game.incrementMs,
    });
    return this.toState(game.id);
  }

  async loadRuntime(gameId: string) {
    if (this.runtime.has(gameId)) return this.runtime.get(gameId)!;
    const g = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!g) throw new NotFoundException('Game not found');
    const chess = new Chess();
    if (g.pgn) {
      chess.loadPgn(g.pgn, { strict: false });
    }
    const rt: RuntimeGame = {
      chess,
      lastTickAt: Date.now(),
      whiteMs: g.whiteMs,
      blackMs: g.blackMs,
      incrementMs: g.incrementMs,
    };
    this.runtime.set(gameId, rt);
    return rt;
  }

  async playMove(gameId: string, userId: string, move: MovePayload) {
    const g = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!g) throw new NotFoundException('Game not found');
    if (g.status !== 'in_progress') throw new Error('Game not in progress');
    let side: Color;
    if (g.whiteId === userId) side = 'white';
    else if (g.blackId === userId) side = 'black';
    else throw new Error('Not a player in this game');
    const rt = await this.loadRuntime(gameId);
    const turn: Color = rt.chess.turn() === 'w' ? 'white' : 'black';
    if (turn !== side) throw new Error('Not your turn');

    const now = Date.now();
    const elapsed = now - rt.lastTickAt;
    if (turn === 'white') rt.whiteMs = Math.max(0, rt.whiteMs - elapsed);
    else rt.blackMs = Math.max(0, rt.blackMs - elapsed);

    // Timeout check before the move
    if ((turn === 'white' && rt.whiteMs <= 0) || (turn === 'black' && rt.blackMs <= 0)) {
      return this.finalize(gameId, turn === 'white' ? 'black_win' : 'white_win', 'timeout');
    }

    const applied = rt.chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    if (!applied) throw new Error('Illegal move');

    // Apply increment to the side that just moved
    if (turn === 'white') rt.whiteMs += rt.incrementMs;
    else rt.blackMs += rt.incrementMs;
    rt.lastTickAt = Date.now();
    rt.drawOfferedBy = undefined;

    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        pgn: rt.chess.pgn(),
        fen: rt.chess.fen(),
        whiteMs: rt.whiteMs,
        blackMs: rt.blackMs,
        lastMoveAt: new Date(),
      },
    });

    // End conditions
    if (rt.chess.isCheckmate()) {
      // The player who just moved won.
      return this.finalize(gameId, turn === 'white' ? 'white_win' : 'black_win', 'checkmate');
    }
    if (rt.chess.isStalemate()) return this.finalize(gameId, 'draw', 'stalemate');
    if (rt.chess.isInsufficientMaterial()) return this.finalize(gameId, 'draw', 'insufficient_material');
    if (rt.chess.isThreefoldRepetition()) return this.finalize(gameId, 'draw', 'threefold');
    if (rt.chess.isDraw()) return this.finalize(gameId, 'draw', 'fifty_move');

    return this.toState(gameId, applied.san);
  }

  async resign(gameId: string, userId: string) {
    const g = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!g) throw new NotFoundException('Game not found');
    if (g.status !== 'in_progress') return this.toState(gameId);
    const status: GameStatus = g.whiteId === userId ? 'black_win' : 'white_win';
    return this.finalize(gameId, status, 'resignation');
  }

  async offerDraw(gameId: string, userId: string) {
    const rt = await this.loadRuntime(gameId);
    const g = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!g) throw new NotFoundException('Game not found');
    const color: Color = g.whiteId === userId ? 'white' : 'black';
    rt.drawOfferedBy = color;
    return color;
  }

  async acceptDraw(gameId: string, userId: string) {
    const g = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!g) throw new NotFoundException('Game not found');
    const rt = await this.loadRuntime(gameId);
    if (!rt.drawOfferedBy) throw new Error('No draw offer');
    const color: Color = g.whiteId === userId ? 'white' : 'black';
    if (rt.drawOfferedBy === color) throw new Error('Cannot accept your own offer');
    return this.finalize(gameId, 'draw', 'draw_agreed');
  }

  async declineDraw(gameId: string) {
    const rt = await this.loadRuntime(gameId);
    rt.drawOfferedBy = undefined;
  }

  async aiMove(gameId: string): Promise<{ state: GameState; san?: string }> {
    const g = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!g || !g.vsAi) throw new Error('Not an AI game');
    if (g.status !== 'in_progress') return { state: await this.toState(gameId) };
    const rt = await this.loadRuntime(gameId);
    const turn: Color = rt.chess.turn() === 'w' ? 'white' : 'black';
    const aiIsWhite = g.whiteId === AI_USER_ID;
    if ((turn === 'white') !== aiIsWhite) {
      return { state: await this.toState(gameId) };
    }
    const level = g.aiLevel ?? 8;
    const depth = Math.max(4, Math.min(18, 4 + Math.floor(level / 2)));
    const res = await this.engine.analyze({ fen: rt.chess.fen(), depth, skill: level });
    if (!res.bestMove) {
      // engine couldn't pick a move — treat as stalemate
      return { state: await this.finalize(gameId, 'draw', 'stalemate') };
    }
    const from = res.bestMove.substring(0, 2);
    const to = res.bestMove.substring(2, 4);
    const promotion = res.bestMove.length > 4 ? (res.bestMove[4] as 'q' | 'r' | 'b' | 'n') : undefined;
    const aiUserId = aiIsWhite ? g.whiteId : g.blackId;
    const state = await this.playMove(gameId, aiUserId, { from, to, promotion });
    return { state, san: rt.chess.history().slice(-1)[0] };
  }

  async finalize(gameId: string, status: GameStatus, reason: GameEndReason): Promise<GameState> {
    const g = await this.prisma.game.findUnique({ where: { id: gameId }, include: { white: true, black: true } });
    if (!g) throw new NotFoundException();
    if (g.status !== 'in_progress') return this.toState(gameId);

    let whiteAfter = g.whiteRatingBefore;
    let blackAfter = g.blackRatingBefore;
    if (!g.vsAi) {
      const result: 0 | 0.5 | 1 = status === 'white_win' ? 1 : status === 'black_win' ? 0 : 0.5;
      [whiteAfter, blackAfter] = updateElo(g.whiteRatingBefore, g.blackRatingBefore, result);
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: g.whiteId },
          data: {
            rating: whiteAfter,
            gamesPlayed: { increment: 1 },
            wins: { increment: status === 'white_win' ? 1 : 0 },
            losses: { increment: status === 'black_win' ? 1 : 0 },
            draws: { increment: status === 'draw' ? 1 : 0 },
          },
        }),
        this.prisma.user.update({
          where: { id: g.blackId },
          data: {
            rating: blackAfter,
            gamesPlayed: { increment: 1 },
            wins: { increment: status === 'black_win' ? 1 : 0 },
            losses: { increment: status === 'white_win' ? 1 : 0 },
            draws: { increment: status === 'draw' ? 1 : 0 },
          },
        }),
      ]);
    }

    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        status,
        endReason: reason,
        whiteRatingAfter: whiteAfter,
        blackRatingAfter: blackAfter,
        finishedAt: new Date(),
      },
    });

    this.runtime.delete(gameId);
    return this.toState(gameId);
  }

  async toState(gameId: string, _lastSan?: string): Promise<GameState> {
    const g = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { white: true, black: true },
    });
    if (!g) throw new NotFoundException();
    const rt = this.runtime.get(gameId);
    const chess = rt?.chess ?? (() => { const c = new Chess(); if (g.pgn) c.loadPgn(g.pgn, { strict: false }); return c; })();
    const turnColor: Color = chess.turn() === 'w' ? 'white' : 'black';
    return {
      id: g.id,
      fen: chess.fen(),
      pgn: chess.pgn(),
      turn: turnColor,
      status: g.status as GameStatus,
      endReason: (g.endReason ?? undefined) as GameEndReason | undefined,
      timeControl: { initial: g.initialTimeMs / 1000, increment: g.incrementMs / 1000 },
      clocks: { white: rt?.whiteMs ?? g.whiteMs, black: rt?.blackMs ?? g.blackMs },
      players: {
        white: { id: g.white.id, username: g.white.username, rating: g.white.rating, ratingDelta: g.whiteRatingAfter != null ? g.whiteRatingAfter - g.whiteRatingBefore : undefined },
        black: { id: g.black.id, username: g.black.username, rating: g.black.rating, ratingDelta: g.blackRatingAfter != null ? g.blackRatingAfter - g.blackRatingBefore : undefined },
      },
      moves: chess.history(),
      vsAi: g.vsAi,
      aiLevel: g.aiLevel ?? undefined,
      createdAt: g.createdAt.toISOString(),
      lastMoveAt: g.lastMoveAt?.toISOString(),
    };
  }

  async get(gameId: string) {
    return this.toState(gameId);
  }

  async checkFlags(): Promise<string[]> {
    // returns IDs of games that just flagged (timeout) so gateway can broadcast.
    const flagged: string[] = [];
    for (const [gameId, rt] of this.runtime.entries()) {
      const g = await this.prisma.game.findUnique({ where: { id: gameId } });
      if (!g || g.status !== 'in_progress') continue;
      const now = Date.now();
      const elapsed = now - rt.lastTickAt;
      const turn: Color = rt.chess.turn() === 'w' ? 'white' : 'black';
      const remaining = turn === 'white' ? rt.whiteMs - elapsed : rt.blackMs - elapsed;
      if (remaining <= 0) {
        await this.finalize(gameId, turn === 'white' ? 'black_win' : 'white_win', 'timeout');
        flagged.push(gameId);
      }
    }
    return flagged;
  }
}
