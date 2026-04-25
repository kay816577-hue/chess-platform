'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

// react-chessboard ships with window-only references; load it client-side only.
const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false, loading: () => <div className="aspect-square w-full bg-neutral-900 rounded" /> },
);

export type BoardProps = ComponentProps<typeof Chessboard>;

export function Board(props: BoardProps) {
  return <Chessboard {...props} />;
}
