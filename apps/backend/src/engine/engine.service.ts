import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { existsSync } from 'fs';

export interface EngineMoveOptions {
  fen: string;
  depth?: number;
  movetime?: number; // ms
  skill?: number; // 0..20
}

export interface EngineEvalResult {
  bestMove: string | null;
  ponder?: string;
  score: number; // centipawns (positive = white). Mate => large clamped.
  mate?: number;
  depth: number;
  pv: string[];
  raw: string[];
}

const DEFAULT_CANDIDATES = [
  process.env.STOCKFISH_PATH,
  '/usr/games/stockfish',
  '/usr/local/bin/stockfish',
  '/usr/bin/stockfish',
  'stockfish',
].filter(Boolean) as string[];

function resolveStockfishPath(): string {
  for (const c of DEFAULT_CANDIDATES) {
    if (c && (c === 'stockfish' || existsSync(c))) return c;
  }
  return 'stockfish';
}

/**
 * Light UCI driver: spawn-per-request. Good enough for a free-tier workload where
 * analysis is occasional and games vs AI are not high-frequency. For higher scale,
 * swap this for a process pool (one warm engine per CPU).
 */
@Injectable()
export class EngineService implements OnModuleDestroy {
  private readonly logger = new Logger(EngineService.name);
  private readonly path = resolveStockfishPath();
  private readonly children = new Set<ChildProcessWithoutNullStreams>();

  isAvailable(): boolean {
    // The real check happens on first spawn; fail soft.
    return Boolean(this.path);
  }

  onModuleDestroy() {
    for (const c of this.children) {
      try { c.kill('SIGKILL'); } catch { /* ignore */ }
    }
  }

  /** Ask the engine for the best move from `fen`. Resolves with the result. */
  async analyze(opts: EngineMoveOptions): Promise<EngineEvalResult> {
    const { fen, depth = 12, movetime, skill } = opts;
    return new Promise<EngineEvalResult>((resolve, reject) => {
      let child: ChildProcessWithoutNullStreams;
      try {
        child = spawn(this.path, [], { stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (err) {
        return reject(err);
      }
      this.children.add(child);

      const raw: string[] = [];
      let lastInfo: { score: number; mate?: number; depth: number; pv: string[] } = {
        score: 0,
        depth: 0,
        pv: [],
      };
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          try { child.stdin.write('stop\n'); } catch { /* ignore */ }
        }
      }, (movetime ?? depth * 200) + 4000);

      const finish = (bestMove: string | null, ponder?: string) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        try { child.stdin.write('quit\n'); } catch { /* ignore */ }
        child.kill();
        this.children.delete(child);
        resolve({
          bestMove,
          ponder,
          score: lastInfo.score,
          mate: lastInfo.mate,
          depth: lastInfo.depth,
          pv: lastInfo.pv,
          raw,
        });
      };

      const handleLine = (line: string) => {
        raw.push(line);
        if (line.startsWith('info')) {
          const depthMatch = /depth (\d+)/.exec(line);
          const scoreMatch = /score (cp|mate) (-?\d+)/.exec(line);
          const pvMatch = /\spv\s+(.+?)(?:\s+(?:bmc|tbhits|hashfull)\b.*)?$/.exec(line);
          if (!depthMatch || !scoreMatch) return;
          const d = Number(depthMatch[1]);
          const kind = scoreMatch[1];
          const val = Number(scoreMatch[2]);
          const pv = pvMatch ? pvMatch[1].split(/\s+/).filter(Boolean) : lastInfo.pv;
          if (kind === 'cp') {
            lastInfo = { score: val, depth: d, pv };
          } else {
            const cp = val > 0 ? 100000 - val * 10 : -100000 - val * 10;
            lastInfo = { score: cp, mate: val, depth: d, pv };
          }
        } else if (line.startsWith('bestmove')) {
          const parts = line.split(/\s+/);
          const best = parts[1];
          const ponderIdx = parts.indexOf('ponder');
          const ponder = ponderIdx >= 0 ? parts[ponderIdx + 1] : undefined;
          finish(best && best !== '(none)' ? best : null, ponder);
        }
      };

      let buf = '';
      child.stdout.on('data', (d: Buffer) => {
        buf += d.toString('utf8');
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) handleLine(line.trim());
      });
      child.stderr.on('data', (d: Buffer) => {
        this.logger.debug(`stockfish stderr: ${d.toString('utf8').trim()}`);
      });
      child.on('error', (err) => {
        if (!resolved) {
          clearTimeout(timer);
          resolved = true;
          this.children.delete(child);
          reject(err);
        }
      });
      child.on('close', () => {
        if (!resolved) {
          clearTimeout(timer);
          resolved = true;
          this.children.delete(child);
          resolve({
            bestMove: null,
            score: lastInfo.score,
            mate: lastInfo.mate,
            depth: lastInfo.depth,
            pv: lastInfo.pv,
            raw,
          });
        }
      });

      const w = (s: string) => child.stdin.write(s + '\n');
      w('uci');
      if (typeof skill === 'number') {
        const clamped = Math.max(0, Math.min(20, Math.round(skill)));
        w(`setoption name Skill Level value ${clamped}`);
        // Also limit strength / depth to make weak levels feel weak.
        if (clamped < 20) {
          w(`setoption name UCI_LimitStrength value true`);
          const elo = 800 + clamped * 100; // 800..2700
          w(`setoption name UCI_Elo value ${elo}`);
        }
      }
      w('isready');
      w(`position fen ${fen}`);
      if (movetime) w(`go movetime ${movetime}`);
      else w(`go depth ${depth}`);
    });
  }
}
