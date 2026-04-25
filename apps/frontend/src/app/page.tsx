import Link from 'next/link';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Real-time play',
    body: 'WebSocket gameplay with clocks, increments, last-move highlighting, and seamless reconnection.',
  },
  {
    icon: '🤖',
    title: 'Stockfish AI',
    body: '21 skill levels (UCI_Elo 800–2700) plus an evaluation bar and best-move arrows.',
  },
  {
    icon: '🧠',
    title: 'Analysis',
    body: 'Paste a PGN, see blunder/mistake/inaccuracy markers, and step through engine lines.',
  },
  {
    icon: '🏆',
    title: 'Elo ratings',
    body: 'Ranked play for signed-up users. Global leaderboard refreshed as games finish.',
  },
  {
    icon: '🎮',
    title: 'Friendly UX',
    body: 'Board flip, sound, premove-style drag, and keyboard shortcuts (F/R/D/M).',
  },
  {
    icon: '📦',
    title: 'Self-hostable',
    body: 'One-command `docker compose up`. Runs on free tiers (Render + Vercel) out of the box.',
  },
];

export default function Home() {
  return (
    <section className="space-y-12">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-900/30 text-emerald-300 px-3 py-1 text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Open-source · AGPL-3.0 · Free forever
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Play chess. <span className="text-brand">Anywhere.</span> Free.
          </h1>
          <p className="text-neutral-300 text-lg">
            Real-time multiplayer, Stockfish AI with 21 skill levels, post-game analysis
            with blunder detection, PGN import/export, and Elo ratings.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/play" className="btn">Play online</Link>
            <Link href="/play/ai" className="btn-outline">Play vs AI</Link>
            <Link href="/analysis" className="btn-outline">Analyze PGN</Link>
          </div>
          <div className="text-xs text-neutral-500 pt-3">
            No signup required. Sign up to save your rating and history.
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="aspect-square rounded bg-gradient-to-br from-emerald-900/30 via-neutral-800 to-neutral-950 grid place-items-center">
            <div className="grid grid-cols-8 gap-0 w-[min(90%,480px)] aspect-square rounded overflow-hidden shadow-2xl ring-1 ring-white/10">
              {Array.from({ length: 64 }).map((_, i) => {
                const r = Math.floor(i / 8);
                const c = i % 8;
                const dark = (r + c) % 2 === 1;
                const piece = STARTING_PIECES[i];
                return (
                  <div
                    key={i}
                    className={`grid place-items-center text-3xl md:text-4xl ${dark ? 'bg-[#779952]' : 'bg-[#edeed1]'}`}
                  >
                    {piece}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card hover:border-neutral-700 transition">
            <div className="text-2xl">{f.icon}</div>
            <h3 className="font-semibold text-white mt-2">{f.title}</h3>
            <p className="text-sm text-neutral-400 mt-1">{f.body}</p>
          </div>
        ))}
      </div>

      <div className="card space-y-3">
        <h2 className="text-xl font-semibold text-white">Self-host in under a minute</h2>
        <p className="text-sm text-neutral-400">
          Everything you need — Postgres, Redis, Stockfish, API, and the Next.js app —
          bootstrapped from one file.
        </p>
        <pre className="rounded bg-black/60 border border-neutral-800 p-3 text-xs text-neutral-200 overflow-auto">
{`git clone https://github.com/kay816577-hue/chess-platform
cd chess-platform
docker compose up --build
# open http://localhost:3000`}
        </pre>
        <p className="text-xs text-neutral-500">
          See <Link href="https://github.com/kay816577-hue/chess-platform/blob/main/README.md" className="underline">README</Link> for cloud deploys (Render + Vercel).
        </p>
      </div>
    </section>
  );
}

// Unicode pieces on a standard starting position.
const STARTING_PIECES: string[] = (() => {
  const row = (order: string, black: boolean) => {
    const map: Record<string, [string, string]> = {
      r: ['♖', '♜'], n: ['♘', '♞'], b: ['♗', '♝'], q: ['♕', '♛'], k: ['♔', '♚'], p: ['♙', '♟'],
    };
    return order.split('').map((ch) => map[ch][black ? 1 : 0]);
  };
  const empty = Array(8).fill('');
  return [
    ...row('rnbqkbnr', true),
    ...row('pppppppp', true),
    ...empty, ...empty, ...empty, ...empty,
    ...row('pppppppp', false),
    ...row('rnbqkbnr', false),
  ];
})();
