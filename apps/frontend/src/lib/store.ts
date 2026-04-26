'use client';

import { create } from 'zustand';
import type { PlayerInfo } from '@chess/shared';

export type SessionUser = PlayerInfo & {
  isGuest: boolean;
  puzzleRating?: number;
  puzzlesSolved?: number;
};

interface SessionState {
  token: string | null;
  user: SessionUser | null;
  setSession: (token: string, user: SessionUser) => void;
  clear: () => void;
  hydrate: () => void;
}

const TOKEN_KEY = 'chess.token';
const USER_KEY = 'chess.user';

export const useSession = create<SessionState>((set) => ({
  token: null,
  user: null,
  setSession: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    set({ token, user });
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    set({ token: null, user: null });
  },
  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    if (token && userRaw) {
      try {
        set({ token, user: JSON.parse(userRaw) });
      } catch {
        /* ignore */
      }
    }
  },
}));
