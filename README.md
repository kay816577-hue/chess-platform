# Chess Platform

Open-source chess platform inspired by Lichess. Real-time multiplayer, Stockfish AI,
matchmaking, Elo ratings, and post-game analysis. Self-hostable with one command, or
deploy to free tiers on Render + Vercel.

![AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue) &nbsp;
![Node 20+](https://img.shields.io/badge/node-20%2B-green) &nbsp;
![yarn 1](https://img.shields.io/badge/yarn-1.22-blue)

## Features

- **Real-time multiplayer** over WebSocket: clocks with increments, draw offers,
  resign, chat, seamless reconnection.
- **Matchmaking** with time-control pools (bullet / blitz / rapid / classical) and
  Elo-tolerance pairing that widens as you wait.
- **Elo ratings** (K=32, floor 100) for signed-up accounts — guests play unrated.
- **Play vs Stockfish** at 21 skill levels (`UCI_Elo` 800–2700).
- **Live eval bar** + best-move arrows (opt-in).
- **Post-game analysis**: blunder / mistake / inaccuracy classification,
  step-through with engine lines, PGN import / export.
- **Quality-of-life**: last-move + check highlighting, board flip, move sound,
  keyboard shortcuts (F flip · R resign · D draw · M mute).
- **Accounts**: guest by default (no signup friction) with optional signup/login
  (bcrypt). A persistent account keeps your rating and history.
- **Leaderboard** of top-rated players.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + Zustand +
  `react-chessboard` + `chess.js`
- **Backend**: NestJS 10 + Socket.IO + Prisma (PostgreSQL) + Redis + `chess.js`
- **Engine**: Stockfish (system binary, bundled in the backend Docker image)
- **Hosting options**: Self-host via Docker Compose, or Render (backend) + Vercel
  (frontend)

## Repo layout

```
apps/
  backend/           # NestJS API + WebSocket gateway + Stockfish worker
  frontend/          # Next.js app
packages/
  shared/            # Shared TypeScript types
docker-compose.yml   # Full local/self-host stack
render.yaml          # Render blueprint (web + postgres + redis)
vercel.json          # Vercel config
DEPLOY.md            # Cloud deploy guide
```

## Quick start — self-host with Docker Compose

Requirements: Docker 24+ and Docker Compose v2.

```bash
git clone https://github.com/kay816577-hue/chess-platform
cd chess-platform
docker compose up --build
# open http://localhost:3000
```

The compose stack includes Postgres, Redis, the NestJS backend (with Stockfish),
and the Next.js frontend. Data persists in a named volume (`pgdata`).

Override defaults with env vars if you want:

```bash
JWT_SECRET="my-long-random-production-secret-please" \
CORS_ORIGIN="https://chess.example.com" \
NEXT_PUBLIC_API_URL="https://chess-api.example.com" \
NEXT_PUBLIC_WS_URL="https://chess-api.example.com" \
  docker compose up --build
```

To stop and wipe data:

```bash
docker compose down -v
```

## Local development (without Docker)

Requirements: Node.js 20+, yarn 1.22+, PostgreSQL 14+, Redis 7+, and Stockfish
(`apt install stockfish` on Debian/Ubuntu, `brew install stockfish` on macOS).

```bash
yarn install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local

# Create schema (uses DATABASE_URL from apps/backend/.env)
yarn workspace @chess/backend exec -- prisma generate
yarn workspace @chess/backend exec -- prisma db push

# Terminal 1 — backend at http://localhost:4000
yarn dev:backend

# Terminal 2 — frontend at http://localhost:3000
yarn dev:frontend
```

If you don't want a full Postgres install, the easiest path is
`docker compose up postgres redis` and point `DATABASE_URL` /
`REDIS_URL` at those containers.

## Testing

```bash
yarn typecheck    # TS across all workspaces
yarn lint         # ESLint + next lint
yarn test         # Jest (backend), passes with no-tests in frontend

# Full production build
yarn build
```

Specific scopes:

```bash
yarn workspace @chess/backend test
yarn workspace @chess/frontend build
```

CI (`.github/workflows/ci.yml`) runs typecheck + lint + tests + prod build on every
PR.

### End-to-end smoke test

With `docker compose up` running:

1. Open two browser windows to `http://localhost:3000`.
2. Each window gets a guest account automatically (check the top right).
3. Both windows click **Play online** → pick the same time control → you get
   paired into a game.
4. Make a few moves in one window; the other window updates in real time.
5. Or visit `/play/ai` in one window to play Stockfish, and `/analysis` to paste
   in a PGN and see blunder markers.

## API overview

All HTTP endpoints are under `/api/*`. WebSocket path is `/socket.io`.

- `POST /api/auth/guest` — create a guest account, returns `{ token, user }`.
- `POST /api/auth/signup` — `{ username, password }` (username 3–24 chars, password 8–128).
- `POST /api/auth/login` — same body as signup.
- `GET /api/auth/me` — returns current user for the bearer token.
- `GET /api/users/leaderboard` — top rated users with games played.
- `GET /api/users/:id` / `GET /api/users/:id/games` — profile + recent games.
- `POST /api/games/ai` — start a game vs Stockfish (`{ level, color, initial, increment }`).
- `GET /api/games/:id` — read a game's state.
- `POST /api/engine/bestmove` — `{ fen, depth?, movetime?, skill? }` → best move + eval.
- `POST /api/engine/analyze` — `{ pgn, depth? }` → per-move classification.
- `GET /health` — liveness + DB check.

WebSocket events (post-auth via `{ auth: { token } }`): `queue`, `queue_cancel`,
`join`, `move`, `resign`, `offer_draw`, `accept_draw`, `decline_draw`, `chat`,
`ping`.

## Configuration

Backend env (see `apps/backend/.env.example`):

| Var | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL |
| `REDIS_URL` | no | If set, used for matchmaking queue; otherwise in-memory |
| `JWT_SECRET` | prod | ≥16 chars. Required in `NODE_ENV=production`. |
| `CORS_ORIGIN` | yes | Comma-separated allow-list, or `*`. |
| `STOCKFISH_PATH` | no | Defaults to `/usr/games/stockfish` / `stockfish` on PATH |
| `PORT` | no | Default `4000` |

Frontend env (see `apps/frontend/.env.example`):

| Var | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (no trailing slash) |
| `NEXT_PUBLIC_WS_URL`  | Same as API URL unless you terminate WS separately |

## Cloud deployment

See [`DEPLOY.md`](./DEPLOY.md) for the Render (backend) + Vercel (frontend)
free-tier flow.

## License

[AGPL-3.0](./LICENSE). Same spirit as Lichess — if you modify and host this,
publish your changes.
