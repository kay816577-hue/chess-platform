export type Color = 'white' | 'black';

export type TimeControl = {
  /** initial time in seconds */
  initial: number;
  /** increment per move in seconds */
  increment: number;
};

export const DEFAULT_TIME_CONTROLS: Record<string, TimeControl> = {
  bullet: { initial: 60, increment: 0 },
  blitz: { initial: 180, increment: 2 },
  rapid: { initial: 600, increment: 5 },
  classical: { initial: 1800, increment: 30 },
};

export type GameStatus =
  | 'waiting'
  | 'in_progress'
  | 'white_win'
  | 'black_win'
  | 'draw'
  | 'aborted';

export type GameEndReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold'
  | 'fifty_move'
  | 'draw_agreed'
  | 'abandoned';

export interface PlayerInfo {
  id: string;
  username: string;
  rating: number;
  ratingDelta?: number;
}

export interface GameState {
  id: string;
  fen: string;
  pgn: string;
  turn: Color;
  status: GameStatus;
  endReason?: GameEndReason;
  timeControl: TimeControl;
  clocks: { white: number; black: number };
  players: { white: PlayerInfo; black: PlayerInfo };
  moves: string[]; // SAN moves
  vsAi?: boolean;
  aiLevel?: number;
  createdAt: string;
  lastMoveAt?: string;
}

export interface MovePayload {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export type ClientEvent =
  | { type: 'auth'; token: string }
  | { type: 'queue'; mode: keyof typeof DEFAULT_TIME_CONTROLS | 'custom'; custom?: TimeControl }
  | { type: 'queue_cancel' }
  | { type: 'join'; gameId: string }
  | { type: 'move'; gameId: string; move: MovePayload }
  | { type: 'resign'; gameId: string }
  | { type: 'offer_draw'; gameId: string }
  | { type: 'accept_draw'; gameId: string }
  | { type: 'decline_draw'; gameId: string }
  | { type: 'chat'; gameId: string; text: string }
  | { type: 'ping' };

export type ServerEvent =
  | { type: 'welcome'; user: PlayerInfo }
  | { type: 'queued'; mode: string }
  | { type: 'match_found'; game: GameState }
  | { type: 'game_state'; game: GameState }
  | { type: 'move_made'; gameId: string; move: MovePayload; san: string; fen: string; clocks: { white: number; black: number } }
  | { type: 'game_over'; game: GameState }
  | { type: 'draw_offered'; gameId: string; by: Color }
  | { type: 'chat'; gameId: string; from: string; text: string; at: string }
  | { type: 'error'; message: string }
  | { type: 'pong' };

export interface AnalyzePgnRequest {
  pgn: string;
  depth?: number;
}

export interface EvaluatedMove {
  ply: number;
  san: string;
  fen: string;
  scoreBefore: number; // centipawns (white positive)
  scoreAfter: number;
  bestMove?: string;
  bestLine?: string[];
  classification?: 'book' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
}

export interface AnalyzePgnResponse {
  moves: EvaluatedMove[];
  result: string;
}
