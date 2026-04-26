'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type ComponentProps } from 'react';
import { getBoardTheme } from '@/lib/theme';

// react-chessboard ships with window-only references; load it client-side only.
const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false, loading: () => <div className="aspect-square w-full bg-neutral-900 rounded" /> },
);

export type BoardProps = ComponentProps<typeof Chessboard>;

export function Board(props: BoardProps) {
  const [theme, setTheme] = useState(() => getBoardTheme());
  useEffect(() => {
    const onChange = () => setTheme(getBoardTheme());
    window.addEventListener('chess:theme', onChange);
    return () => window.removeEventListener('chess:theme', onChange);
  }, []);
  return (
    <Chessboard
      customDarkSquareStyle={{ backgroundColor: theme.dark }}
      customLightSquareStyle={{ backgroundColor: theme.light }}
      {...props}
    />
  );
}
