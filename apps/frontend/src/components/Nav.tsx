'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useSession } from '@/lib/store';
import { api } from '@/lib/api';

export function Nav() {
  const { user, token, setSession, hydrate, clear } = useSession();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!token) {
      api.guest().then((r) => setSession(r.token, r.user)).catch(() => undefined);
    }
  }, [token, setSession]);

  return (
    <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
        <Link href="/" className="font-bold text-lg text-white">♞ Chess Platform</Link>
        <nav className="flex gap-4 text-sm text-neutral-300">
          <Link href="/play">Play</Link>
          <Link href="/play/ai">vs AI</Link>
          <Link href="/analysis">Analysis</Link>
          <Link href="/leaderboard">Leaderboard</Link>
        </nav>
        <div className="ml-auto text-sm text-neutral-400 flex items-center gap-3">
          {user ? (
            <>
              <span>{user.username} <span className="text-neutral-500">({user.rating})</span>{user.isGuest && <span className="ml-1 rounded bg-neutral-800 text-neutral-300 px-1.5 py-0.5 text-[10px] align-middle">guest</span>}</span>
              {user.isGuest && <Link href="/auth" className="btn-outline text-xs">Sign in</Link>}
              <button className="btn-outline text-xs" onClick={() => { clear(); location.reload(); }}>Sign out</button>
            </>
          ) : (
            <span>Connecting…</span>
          )}
        </div>
      </div>
    </header>
  );
}
