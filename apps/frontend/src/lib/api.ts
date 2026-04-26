import { API_URL } from './config';
import type { AnalyzePgnRequest, AnalyzePgnResponse, GameState, PlayerInfo } from '@chess/shared';

export interface AuthResponse {
  token: string;
  user: PlayerInfo & { isGuest: boolean };
}

async function request<T>(path: string, init?: RequestInit & { auth?: string }): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (init?.auth) headers['Authorization'] = `Bearer ${init.auth}`;
  const res = await fetch(`${API_URL}/api${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const api = {
  async guest(): Promise<AuthResponse> {
    return request('/auth/guest', { method: 'POST' });
  },
  async signup(username: string, password: string): Promise<AuthResponse> {
    return request('/auth/signup', { method: 'POST', body: JSON.stringify({ username, password }) });
  },
  async login(username: string, password: string): Promise<AuthResponse> {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  },
  async me(token: string): Promise<PlayerInfo & { isGuest: boolean; puzzleRating?: number; puzzlesSolved?: number }> {
    return request('/auth/me', { auth: token });
  },
  async randomPuzzle(): Promise<{ id: string; fen: string; firstMove: string; solution: string[]; rating: number; themes: string[] }> {
    return request('/puzzles/random');
  },
  async recordAttempt(token: string | null, puzzleId: string, success: boolean): Promise<{ rating: number; delta?: number }> {
    return request('/puzzles/attempt', {
      method: 'POST',
      body: JSON.stringify({ puzzleId, success }),
      auth: token ?? undefined,
    });
  },
  async leaderboard(): Promise<Array<PlayerInfo & { gamesPlayed: number; wins: number; losses: number; draws: number }>> {
    return request('/users/leaderboard');
  },
  async game(id: string): Promise<GameState> {
    return request(`/games/${id}`);
  },
  async createAiGame(token: string, body: { level: number; color?: 'white' | 'black' | 'random'; initial?: number; increment?: number }): Promise<GameState> {
    return request(`/games/ai`, { method: 'POST', body: JSON.stringify(body), auth: token });
  },
  async bestmove(fen: string, depth = 12): Promise<{ bestMove: string | null; score: number; pv: string[]; depth: number; mate?: number }> {
    return request(`/engine/bestmove`, { method: 'POST', body: JSON.stringify({ fen, depth }) });
  },
  async analyzePgn(body: AnalyzePgnRequest): Promise<AnalyzePgnResponse> {
    return request(`/engine/analyze`, { method: 'POST', body: JSON.stringify(body) });
  },
};
