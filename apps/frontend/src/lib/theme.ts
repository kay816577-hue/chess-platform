'use client';

export interface BoardTheme {
  name: string;
  light: string;
  dark: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { name: 'Forest', light: '#edeed1', dark: '#779952' },
  { name: 'Classic', light: '#f0d9b5', dark: '#b58863' },
  { name: 'Ocean', light: '#dee3e6', dark: '#788a94' },
  { name: 'Dusk',    light: '#e8e6f2', dark: '#6d6893' },
  { name: 'Red',     light: '#f1d9c2', dark: '#bc5a5a' },
  { name: 'Midnight', light: '#cfd3d9', dark: '#2c3e50' },
];

const KEY = 'chess.theme';

export function getBoardTheme(): BoardTheme {
  if (typeof window === 'undefined') return BOARD_THEMES[0];
  const stored = window.localStorage.getItem(KEY);
  if (!stored) return BOARD_THEMES[0];
  return BOARD_THEMES.find((t) => t.name === stored) ?? BOARD_THEMES[0];
}

export function setBoardTheme(name: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, name);
  window.dispatchEvent(new CustomEvent('chess:theme', { detail: name }));
}
