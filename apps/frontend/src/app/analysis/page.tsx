'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { Board } from '@/components/Board';
import { EvalBar } from '@/components/EvalBar';
import { api } from '@/lib/api';
import type { AnalyzePgnResponse, EvaluatedMove } from '@chess/shared';

const SAMPLE_PGN = `[Event "Sample"]
[Site "?"]
[Date "????.??.??"]
[Round "?"]
[White "Player"]
[Black "Opponent"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *`;

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="text-neutral-400">Loading…</div>}>
      <AnalysisPageInner />
    </Suspense>
  );
}

function AnalysisPageInner() {
  const params = useSearchParams();
  const initialPgn = params.get('pgn') ?? SAMPLE_PGN;
  const [pgn, setPgn] = useState(initialPgn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzePgnResponse | null>(null);
  const [ply, setPly] = useState(0);

  const chess = useMemo(() => {
    const c = new Chess();
    c.loadPgn(pgn, { strict: false });
    return c;
  }, [pgn]);

  const history = chess.history();
  const selected: EvaluatedMove | null = analysis ? analysis.moves[Math.min(ply, analysis.moves.length - 1)] ?? null : null;

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzePgn({ pgn, depth: 10 });
      setAnalysis(res);
      setPly(res.moves.length - 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPly(0);
    setAnalysis(null);
  }, [pgn]);

  const displayFen = analysis ? selected?.fen ?? chess.fen() : chess.fen();

  const download = () => {
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game.pgn';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(pgn);
  };

  return (
    <section className="grid lg:grid-cols-[48px_minmax(0,1fr)_360px] gap-4">
      <div className="hidden lg:block h-[min(80vh,640px)]">
        {analysis && selected && <EvalBar score={selected.scoreAfter} orientation="white" />}
      </div>
      <div className="space-y-3">
        <div className="aspect-square">
          <Board
            position={displayFen}
            arePiecesDraggable={false}
            boardOrientation="white"
            customDarkSquareStyle={{ backgroundColor: '#779952' }}
            customLightSquareStyle={{ backgroundColor: '#edeed1' }}
            customArrows={selected?.bestMove && selected.bestMove.length >= 4
              ? [[selected.bestMove.slice(0, 2) as Square, selected.bestMove.slice(2, 4) as Square, '#22c55e']]
              : []}
          />
        </div>
        {analysis && (
          <div className="flex items-center gap-2">
            <button className="btn-outline text-sm" onClick={() => setPly(0)}>|&lt;</button>
            <button className="btn-outline text-sm" onClick={() => setPly((p) => Math.max(0, p - 1))}>&lt;</button>
            <input type="range" min={0} max={analysis.moves.length - 1} value={ply} onChange={(e) => setPly(Number(e.target.value))} className="flex-1 accent-emerald-500" />
            <button className="btn-outline text-sm" onClick={() => setPly((p) => Math.min(analysis.moves.length - 1, p + 1))}>&gt;</button>
            <button className="btn-outline text-sm" onClick={() => setPly(analysis.moves.length - 1)}>&gt;|</button>
          </div>
        )}
      </div>
      <aside className="space-y-3">
        <div className="card space-y-3">
          <textarea
            className="input w-full h-48 font-mono text-xs"
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            <button onClick={run} disabled={loading} className="btn text-sm">{loading ? 'Analyzing…' : 'Analyze'}</button>
            <button onClick={copy} className="btn-outline text-sm">Copy PGN</button>
            <button onClick={download} className="btn-outline text-sm">Download</button>
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div className="text-xs text-neutral-500">{history.length} half-moves · Result {chess.header().Result ?? '*'}</div>
        </div>
        {analysis && selected && (
          <div className="card space-y-2 text-sm">
            <div className="text-white font-medium">Move {selected.ply}: {selected.san}</div>
            <div className="text-neutral-400">
              Eval: {(selected.scoreAfter / 100).toFixed(2)}
              {selected?.bestMove && <> · Engine best: <span className="font-mono text-neutral-200">{selected.bestMove}</span></>}
              {selected?.classification && <> · <span className={
                selected.classification === 'blunder' ? 'text-red-400' :
                selected.classification === 'mistake' ? 'text-orange-400' :
                selected.classification === 'inaccuracy' ? 'text-amber-400' :
                'text-emerald-400'
              }>{selected.classification}</span></>}
            </div>
            {selected?.bestLine && <div className="text-xs text-neutral-500 font-mono">Line: {selected.bestLine.join(' ')}</div>}
            <div className="max-h-60 overflow-auto grid grid-cols-[auto_1fr] gap-x-2 text-xs">
              {analysis.moves.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setPly(i)}
                  className={`col-span-2 text-left hover:bg-neutral-800/50 rounded px-1 py-0.5 grid grid-cols-[auto_1fr_auto] gap-2 ${i === ply ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
                >
                  <span className="text-neutral-500 font-mono">{Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : '…'}</span>
                  <span className="font-mono">{m.san}</span>
                  <span className={
                    m.classification === 'blunder' ? 'text-red-400' :
                    m.classification === 'mistake' ? 'text-orange-400' :
                    m.classification === 'inaccuracy' ? 'text-amber-400' :
                    'text-neutral-500'
                  }>
                    {m.classification === 'blunder' ? '??' :
                     m.classification === 'mistake' ? '?' :
                     m.classification === 'inaccuracy' ? '?!' :
                     ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}
