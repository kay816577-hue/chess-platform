'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { Board } from '@/components/Board';
import { Clock } from '@/components/Clock';
import { EvalBar } from '@/components/EvalBar';
import { useSession } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { initSound, isSoundEnabled, setSoundEnabled, playSound } from '@/lib/sound';
import type { GameState, ServerEvent } from '@chess/shared';

type Highlight = Record<string, React.CSSProperties>;

const HIGHLIGHT_LAST = 'rgba(155, 199, 0, 0.35)';
const HIGHLIGHT_CHECK = 'rgba(255, 70, 70, 0.55)';

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const { token, user, hydrate } = useSession();
  const [state, setState] = useState<GameState | null>(null);
  const [evalScore, setEvalScore] = useState<number | null>(null);
  const [showEval, setShowEval] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [chat, setChat] = useState<Array<{ from: string; text: string; at: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [drawOfferedBy, setDrawOfferedBy] = useState<'white' | 'black' | null>(null);
  const [flipped, setFlipped] = useState(false);
  const chessRef = useRef(new Chess());
  const lastMoveCountRef = useRef(0);
  const [displayFen, setDisplayFen] = useState<string>('start');
  const [whiteClock, setWhiteClock] = useState(0);
  const [blackClock, setBlackClock] = useState(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => { hydrate(); initSound(); setSoundOn(isSoundEnabled()); }, [hydrate]);

  useEffect(() => {
    if (!token || !gameId) return;
    const sock = getSocket(token);

    const onServer = (evt: ServerEvent) => {
      if (evt.type === 'welcome') return;
      if (evt.type === 'game_state' || evt.type === 'match_found' || evt.type === 'game_over') {
        const g = evt.game;
        if (g.id !== gameId) return;
        setState(g);
        const next = new Chess();
        if (g.pgn) next.loadPgn(g.pgn, { strict: false });
        const prevCount = lastMoveCountRef.current;
        const newCount = next.history().length;
        chessRef.current = next;
        setDisplayFen(next.fen());
        setWhiteClock(g.clocks.white);
        setBlackClock(g.clocks.black);
        setDrawOfferedBy(null);
        if (newCount > prevCount) {
          const last = next.history({ verbose: true }).slice(-1)[0];
          if (evt.type === 'game_over') playSound('end');
          else if (next.isCheck()) playSound('check');
          else if (last?.captured) playSound('capture');
          else playSound('move');
        } else if (evt.type === 'game_over') {
          playSound('end');
        }
        lastMoveCountRef.current = newCount;
      } else if (evt.type === 'chat') {
        setChat((prev) => [...prev.slice(-49), { from: evt.from, text: evt.text, at: evt.at }]);
      } else if (evt.type === 'draw_offered') {
        setDrawOfferedBy(evt.by);
      } else if (evt.type === 'error') {
        // eslint-disable-next-line no-console
        console.error(evt.message);
      }
    };

    const onConnect = () => { sock.emit('join', { gameId }); };

    sock.on('connect', onConnect);
    sock.on('server', onServer);
    if (sock.connected) onConnect();

    return () => {
      sock.off('connect', onConnect);
      sock.off('server', onServer);
    };
  }, [token, gameId]);

  // client-side clock tick (interpolated)
  useEffect(() => {
    if (!state || state.status !== 'in_progress') {
      if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    const start = performance.now();
    const startW = state.clocks.white;
    const startB = state.clocks.black;
    const turn = state.turn;
    tickRef.current = window.setInterval(() => {
      const elapsed = performance.now() - start;
      if (turn === 'white') { setWhiteClock(Math.max(0, startW - elapsed)); setBlackClock(startB); }
      else { setBlackClock(Math.max(0, startB - elapsed)); setWhiteClock(startW); }
    }, 100);
    return () => {
      if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    };
  }, [state]);

  const myColor: 'white' | 'black' | null = useMemo(() => {
    if (!state || !user) return null;
    if (state.players.white.id === user.id) return 'white';
    if (state.players.black.id === user.id) return 'black';
    return null;
  }, [state, user]);

  const naturalOrientation: 'white' | 'black' = myColor ?? 'white';
  const boardOrientation: 'white' | 'black' = flipped
    ? (naturalOrientation === 'white' ? 'black' : 'white')
    : naturalOrientation;

  const onDrop = useCallback((from: string, to: string): boolean => {
    if (!state || !token || !myColor || state.status !== 'in_progress') return false;
    if (state.turn !== myColor) return false;
    const piece = chessRef.current.get(from as Square);
    if (!piece) return false;
    const pieceColor = piece.color === 'w' ? 'white' : 'black';
    if (pieceColor !== myColor) return false;

    const isPromotion = piece.type === 'p' && (to.endsWith('1') || to.endsWith('8'));
    const move = { from, to, promotion: isPromotion ? ('q' as const) : undefined };
    const copy = new Chess(chessRef.current.fen());
    const applied = copy.move({ from, to, promotion: isPromotion ? 'q' : undefined });
    if (!applied) return false;
    // Optimistic: show locally, sound on own move
    if (applied.captured) playSound('capture');
    else playSound('move');
    chessRef.current = copy;
    setDisplayFen(copy.fen());
    const sock = getSocket(token);
    sock.emit('move', { gameId, move });
    return true;
  }, [gameId, state, token, myColor]);

  const resign = useCallback(() => { if (token) getSocket(token).emit('resign', { gameId }); }, [token, gameId]);
  const offerDraw = useCallback(() => { if (token) getSocket(token).emit('offer_draw', { gameId }); }, [token, gameId]);
  const acceptDraw = useCallback(() => { if (token) getSocket(token).emit('accept_draw', { gameId }); }, [token, gameId]);
  const declineDraw = useCallback(() => {
    if (!token) return;
    getSocket(token).emit('decline_draw', { gameId });
    setDrawOfferedBy(null);
  }, [token, gameId]);
  const sendChat = () => {
    if (!chatInput.trim() || !token) return;
    getSocket(token).emit('chat', { gameId, text: chatInput.trim() });
    setChatInput('');
  };

  // Keyboard shortcuts: F flip, R resign, D draw, M mute
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.key === 'f' || e.key === 'F') setFlipped((v) => !v);
      else if (e.key === 'r' || e.key === 'R') resign();
      else if (e.key === 'd' || e.key === 'D') offerDraw();
      else if (e.key === 'm' || e.key === 'M') {
        setSoundOn((prev) => { const next = !prev; setSoundEnabled(next); return next; });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resign, offerDraw]);

  // Evaluation polling
  useEffect(() => {
    if (!showEval || !state || state.status !== 'in_progress') { setEvalScore(null); return; }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await api.bestmove(chessRef.current.fen(), 10);
        if (!cancelled) setEvalScore(res.score);
      } catch { /* ignore */ }
    };
    poll();
    return () => { cancelled = true; };
  }, [showEval, displayFen, state]);

  const highlights: Highlight = useMemo(() => {
    const sq: Highlight = {};
    const history = chessRef.current.history({ verbose: true });
    const last = history[history.length - 1];
    if (last) {
      sq[last.from] = { background: HIGHLIGHT_LAST };
      sq[last.to] = { background: HIGHLIGHT_LAST };
    }
    if (chessRef.current.isCheck()) {
      const turn = chessRef.current.turn();
      const board = chessRef.current.board();
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const p = board[r][f];
          if (p && p.type === 'k' && p.color === turn) {
            const file = 'abcdefgh'[f];
            const rank = String(8 - r);
            sq[`${file}${rank}`] = { background: HIGHLIGHT_CHECK };
          }
        }
      }
    }
    return sq;
    // chessRef.current reflects the latest board; recompute when fen changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayFen]);

  if (!state) return <div className="text-neutral-400">Loading game…</div>;

  const topPlayer = boardOrientation === 'white' ? state.players.black : state.players.white;
  const bottomPlayer = boardOrientation === 'white' ? state.players.white : state.players.black;
  const topClock = boardOrientation === 'white' ? blackClock : whiteClock;
  const bottomClock = boardOrientation === 'white' ? whiteClock : blackClock;
  const topActive = state.status === 'in_progress' && state.turn === (boardOrientation === 'white' ? 'black' : 'white');
  const bottomActive = state.status === 'in_progress' && state.turn === boardOrientation;
  const gameOver = state.status !== 'in_progress';
  const drawOfferedToMe = drawOfferedBy && myColor && drawOfferedBy !== myColor;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[64px_minmax(0,1fr)_320px] gap-4">
      <div className="hidden lg:block h-[min(80vh,640px)]">
        {showEval && <EvalBar score={evalScore} orientation={boardOrientation} />}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-300">{topPlayer.username} <span className="text-neutral-500">({topPlayer.rating})</span></div>
          <Clock ms={topClock} active={topActive} label={boardOrientation === 'white' ? 'black' : 'white'} />
        </div>
        <div className="aspect-square">
          <Board
            position={displayFen}
            boardOrientation={boardOrientation}
            onPieceDrop={(from, to) => onDrop(from, to)}
            arePiecesDraggable={!gameOver && !!myColor}
            customBoardStyle={{ borderRadius: 8, boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
            customSquareStyles={highlights}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-300">{bottomPlayer.username} <span className="text-neutral-500">({bottomPlayer.rating})</span></div>
          <Clock ms={bottomClock} active={bottomActive} label={boardOrientation} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
          <button className="btn-outline text-xs" onClick={() => setFlipped((v) => !v)} title="Flip board (F)">⇅ Flip</button>
          <button className="btn-outline text-xs" onClick={() => {
            const next = !soundOn; setSoundEnabled(next); setSoundOn(next);
          }} title="Toggle sound (M)">{soundOn ? '🔊 Sound' : '🔇 Muted'}</button>
          <span className="self-center">Shortcuts: F flip · R resign · D draw · M mute</span>
        </div>
      </div>
      <aside className="space-y-3">
        <div className="card">
          {gameOver ? (
            <div className="space-y-2">
              <div className="text-lg font-semibold text-white">
                {state.status === 'draw' ? 'Draw' : state.status === 'white_win' ? 'White wins' : state.status === 'black_win' ? 'Black wins' : 'Aborted'}
              </div>
              <div className="text-sm text-neutral-400">{state.endReason?.replace(/_/g, ' ')}</div>
              {state.players.white.ratingDelta != null && (
                <div className="text-sm">
                  White {state.players.white.ratingDelta >= 0 ? '+' : ''}{state.players.white.ratingDelta} · Black {state.players.black.ratingDelta != null && state.players.black.ratingDelta >= 0 ? '+' : ''}{state.players.black.ratingDelta}
                </div>
              )}
              <div className="flex gap-2">
                <a href={`/analysis?pgn=${encodeURIComponent(state.pgn)}`} className="btn-outline text-sm">Analyze game</a>
                <button className="btn-outline text-sm" onClick={() => {
                  navigator.clipboard?.writeText(state.pgn).catch(() => undefined);
                }}>Copy PGN</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {!!myColor && <button className="btn-outline text-sm" onClick={offerDraw}>Offer draw</button>}
              {!!myColor && <button className="btn-outline text-sm" onClick={resign}>Resign</button>}
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showEval} onChange={(e) => setShowEval(e.target.checked)} /> Show evaluation bar
              </label>
            </div>
          )}
          {drawOfferedToMe && (
            <div className="mt-3 rounded-md border border-amber-800 bg-amber-950/40 p-3 text-sm">
              Opponent offered a draw.
              <div className="flex gap-2 mt-2">
                <button className="btn text-xs" onClick={acceptDraw}>Accept</button>
                <button className="btn-outline text-xs" onClick={declineDraw}>Decline</button>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <div className="text-sm font-medium text-white mb-2">Moves</div>
          <div className="font-mono text-xs text-neutral-300 grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-0.5 max-h-56 overflow-auto">
            {Array.from({ length: Math.ceil(state.moves.length / 2) }).map((_, i) => (
              <div key={i} className="contents">
                <div className="text-neutral-500">{i + 1}.</div>
                <div>{state.moves[i * 2] ?? ''}</div>
                <div>{state.moves[i * 2 + 1] ?? ''}</div>
              </div>
            ))}
            {state.moves.length === 0 && <div className="text-neutral-500 col-span-3">No moves yet.</div>}
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-white mb-2">Chat</div>
          <div className="h-40 overflow-auto text-sm text-neutral-300 space-y-1">
            {chat.map((c, i) => (
              <div key={i}><span className="text-neutral-500">{c.from}:</span> {c.text}</div>
            ))}
            {chat.length === 0 && <div className="text-neutral-500 text-xs">No messages yet.</div>}
          </div>
          <div className="flex gap-2 mt-2">
            <input className="input flex-1 text-sm" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="Say something…" />
            <button onClick={sendChat} className="btn-outline text-sm">Send</button>
          </div>
        </div>
      </aside>
    </section>
  );
}
