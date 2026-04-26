'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { Board } from '@/components/Board';
import { api } from '@/lib/api';
import { useSession } from '@/lib/store';
import { initSound, playSound } from '@/lib/sound';

interface Puzzle {
  id: string;
  fen: string;
  firstMove: string;
  solution: string[];
  rating: number;
  themes: string[];
}

type Status = 'loading' | 'playing' | 'solved' | 'failed';

export default function PuzzlesPage() {
  const { token, user, hydrate } = useSession();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string>('');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [fen, setFen] = useState('start');
  const [moveIdx, setMoveIdx] = useState(0); // how many moves of the solution have been made
  const [streak, setStreak] = useState(0);
  const chessRef = useRef(new Chess());
  const lastHighlight = useRef<[string, string] | null>(null);
  const [highlight, setHighlight] = useState<Record<string, React.CSSProperties>>({});

  useEffect(() => { hydrate(); initSound(); }, [hydrate]);

  const load = useCallback(async () => {
    setStatus('loading');
    setMessage('');
    const p = await api.randomPuzzle();
    setPuzzle(p);
    const c = new Chess(p.fen);
    chessRef.current = c;
    // Side to move in the FEN is the opponent; board orientation is the solver.
    const solverSide = c.turn() === 'w' ? 'black' : 'white';
    setOrientation(solverSide);
    // Auto-apply first move (the opponent's move) after a short delay.
    setFen(c.fen());
    setMoveIdx(0);
    setStatus('playing');
    setTimeout(() => {
      const mv = p.solution[0];
      const res = c.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] as 'q' | 'r' | 'b' | 'n' | undefined });
      if (res) {
        lastHighlight.current = [mv.slice(0, 2), mv.slice(2, 4)];
        setHighlight({
          [mv.slice(0, 2)]: { background: 'rgba(155,199,0,0.35)' },
          [mv.slice(2, 4)]: { background: 'rgba(155,199,0,0.35)' },
        });
        setFen(c.fen());
        setMoveIdx(1);
        playSound(res.captured ? 'capture' : 'move');
      }
    }, 400);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDrop = useCallback((from: string, to: string): boolean => {
    if (!puzzle || status !== 'playing') return false;
    const expected = puzzle.solution[moveIdx];
    if (!expected) return false;
    const userUci = `${from}${to}`;
    const needsPromotion = expected.length === 5;
    // chess.js needs us to actually try the move.
    const copy = new Chess(chessRef.current.fen());
    const tried = copy.move({ from, to, promotion: needsPromotion ? (expected[4] as 'q') : 'q' });
    if (!tried) return false;

    const correctSquares = expected.slice(0, 4) === userUci;
    if (!correctSquares) {
      setStatus('failed');
      setMessage('Not quite. Try again or see the answer.');
      setStreak(0);
      playSound('check');
      void api.recordAttempt(token, puzzle.id, false).catch(() => undefined);
      return false;
    }

    chessRef.current = copy;
    setFen(copy.fen());
    setHighlight({
      [from]: { background: 'rgba(155,199,0,0.35)' },
      [to]: { background: 'rgba(155,199,0,0.35)' },
    });
    playSound(tried.captured ? 'capture' : 'move');

    const nextIdx = moveIdx + 1;
    if (nextIdx >= puzzle.solution.length) {
      // Solved!
      setStatus('solved');
      setStreak((s) => s + 1);
      setMessage('Solved!');
      playSound('end');
      void api.recordAttempt(token, puzzle.id, true).then((r) => {
        if (r?.delta) setMessage(`Solved! Puzzle rating ${r.delta >= 0 ? '+' : ''}${r.delta}.`);
      }).catch(() => undefined);
      return true;
    }
    // Auto-play next opponent move after a beat.
    setMoveIdx(nextIdx);
    setTimeout(() => {
      const opp = puzzle.solution[nextIdx];
      const oppMv = chessRef.current.move({ from: opp.slice(0, 2), to: opp.slice(2, 4), promotion: opp[4] as 'q' | 'r' | 'b' | 'n' | undefined });
      if (oppMv) {
        setFen(chessRef.current.fen());
        setHighlight({
          [opp.slice(0, 2)]: { background: 'rgba(155,199,0,0.35)' },
          [opp.slice(2, 4)]: { background: 'rgba(155,199,0,0.35)' },
        });
        playSound(oppMv.captured ? 'capture' : 'move');
        setMoveIdx(nextIdx + 1);
      }
    }, 300);
    return true;
  }, [puzzle, moveIdx, status, token]);

  const hint = puzzle && status === 'playing'
    ? puzzle.solution[moveIdx]?.slice(0, 2)
    : null;

  const stats = useMemo(() => {
    if (!user) return null;
    return `Your rating: ${user.puzzleRating ?? 1200} · Solved: ${user.puzzlesSolved ?? 0}`;
  }, [user]);

  return (
    <section className="max-w-5xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
      <div className="space-y-3">
        <div className="aspect-square">
          <Board
            position={fen}
            boardOrientation={orientation}
            onPieceDrop={(from, to) => onDrop(from as Square, to as Square)}
            arePiecesDraggable={status === 'playing'}
            customBoardStyle={{ borderRadius: 8, boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
            customSquareStyles={highlight}
          />
        </div>
      </div>
      <aside className="space-y-3">
        <div className="card space-y-2">
          <h1 className="text-xl font-semibold text-white">Puzzle</h1>
          {puzzle && (
            <>
              <div className="text-sm text-neutral-400">
                Rating <span className="text-neutral-200 font-mono">{puzzle.rating}</span> · Themes: {puzzle.themes.join(', ') || '—'}
              </div>
              <div className="text-sm text-neutral-300">
                {status === 'playing' && `${orientation === 'white' ? 'White' : 'Black'} to move.`}
                {status === 'solved' && <span className="text-emerald-400">{message}</span>}
                {status === 'failed' && <span className="text-amber-400">{message}</span>}
              </div>
            </>
          )}
        </div>
        <div className="card space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button className="btn" onClick={() => load()}>{status === 'solved' ? 'Next puzzle' : 'Skip / Next'}</button>
            <button
              className="btn-outline"
              disabled={!hint}
              onClick={() => {
                if (hint) setHighlight((h) => ({ ...h, [hint]: { background: 'rgba(255,205,0,0.45)' } }));
              }}
            >
              Hint
            </button>
          </div>
          {status === 'failed' && puzzle && (
            <button
              className="btn-outline w-full text-sm"
              onClick={() => {
                const full = puzzle.solution.slice(0).join(' ');
                setMessage(`Solution: ${full}`);
              }}
            >
              Show solution
            </button>
          )}
        </div>
        <div className="card text-sm text-neutral-400">
          Streak: <span className="text-white font-semibold">{streak}</span>
          {stats && <div className="mt-1 text-xs">{stats}</div>}
          {!user && <div className="mt-1 text-xs">Sign in to track your puzzle rating.</div>}
        </div>
      </aside>
    </section>
  );
}
