'use client';

import clsx from 'clsx';

export function EvalBar({ score, orientation = 'white' }: { score: number | null; orientation?: 'white' | 'black' }) {
  const cp = score ?? 0;
  const pct = Math.max(0, Math.min(100, 50 + (Math.tanh(cp / 400) * 50)));
  const whiteHeight = orientation === 'white' ? 100 - pct : pct;
  const label = score == null ? '...' : cp > 9000 ? '+M' : cp < -9000 ? '-M' : (cp / 100).toFixed(1);
  return (
    <div className="relative w-6 h-full rounded overflow-hidden border border-neutral-800 bg-black flex flex-col">
      <div className="bg-neutral-900 transition-[height] duration-300" style={{ height: `${whiteHeight}%` }} />
      <div className="bg-neutral-50 flex-1 transition-[height] duration-300" />
      <div className={clsx('absolute inset-x-0 text-[10px] font-mono text-center',
        whiteHeight > 50 ? 'top-1 text-neutral-400' : 'bottom-1 text-neutral-700')}>{label}</div>
    </div>
  );
}
