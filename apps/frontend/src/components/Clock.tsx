'use client';

import clsx from 'clsx';

function format(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (ms < 10_000) {
    const tenths = Math.max(0, Math.floor((ms % 1000) / 100));
    return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Clock({ ms, active, label }: { ms: number; active: boolean; label: string }) {
  return (
    <div className={clsx('rounded-md border px-4 py-2 font-mono text-2xl tabular-nums min-w-[8rem] text-center',
      active ? 'bg-emerald-600 text-black border-emerald-400' : 'bg-neutral-900 text-neutral-200 border-neutral-800',
      ms < 10_000 && active ? 'animate-pulse' : '',
    )}>
      <div className="text-[10px] uppercase tracking-wide opacity-70 text-left">{label}</div>
      {format(ms)}
    </div>
  );
}
