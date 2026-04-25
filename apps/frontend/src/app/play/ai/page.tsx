'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/store';
import { api } from '@/lib/api';

export default function PlayAiLobby() {
  const { token } = useSession();
  const router = useRouter();
  const [level, setLevel] = useState(8);
  const [color, setColor] = useState<'white' | 'black' | 'random'>('random');
  const [initial, setInitial] = useState(600);
  const [increment, setIncrement] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const game = await api.createAiGame(token, { level, color, initial, increment });
      router.push(`/game/${game.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Play vs Stockfish</h1>
        <p className="text-neutral-400 text-sm mt-1">Choose a skill level (0 = beginner, 20 = master).</p>
      </div>
      <div className="card space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-400">Skill level: <span className="text-white">{level}</span> (UCI_Elo ≈ {800 + level * 100})</span>
          <input type="range" min={0} max={20} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="w-full accent-emerald-500 mt-1" />
        </label>
        <label className="block">
          <span className="text-sm text-neutral-400">Your color</span>
          <div className="flex gap-2 mt-1">
            {(['white', 'black', 'random'] as const).map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`btn-outline text-sm ${color === c ? 'border-brand text-white' : ''}`}>{c}</button>
            ))}
          </div>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-neutral-400">Initial time (s)</span>
            <input type="number" min={10} value={initial} onChange={(e) => setInitial(Math.max(10, Number(e.target.value)))} className="input w-full mt-1" />
          </label>
          <label className="block">
            <span className="text-sm text-neutral-400">Increment (s)</span>
            <input type="number" min={0} value={increment} onChange={(e) => setIncrement(Math.max(0, Number(e.target.value)))} className="input w-full mt-1" />
          </label>
        </div>
        <button disabled={!token || loading} onClick={start} className="btn w-full">
          {loading ? 'Starting…' : 'Start game'}
        </button>
        {error && <div className="text-sm text-red-400">{error}</div>}
      </div>
    </section>
  );
}
