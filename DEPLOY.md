# Deployment

Two services: **backend on Render**, **frontend on Vercel**. Both use free tiers.

## Backend (Render, via render.yaml blueprint)

`render.yaml` provisions:
- `chess-postgres` (Postgres free plan)
- `chess-redis` (Redis free plan)
- `chess-backend` (Docker web service, runs NestJS + Stockfish)

The Dockerfile installs the `stockfish` apt package so the binary is present at `/usr/games/stockfish`. On boot the container runs `prisma migrate deploy` then `node dist/main.js`.

Quick deploy:

1. Push this repo to GitHub.
2. In Render, **New → Blueprint**, point at this repo's `render.yaml`, apply.
3. After the web service is live, copy its public URL (e.g. `https://chess-backend-XXXX.onrender.com`) and set the `CORS_ORIGIN` env var on the service to the Vercel frontend origin (see next section).

Or automated via API (used by Devin sessions):

```bash
# creates the blueprint from GitHub
curl -sX POST https://api.render.com/v1/blueprints \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"repo":"https://github.com/kay816577-hue/chess-platform","branch":"main"}'
```

## Frontend (Vercel)

Configure the Vercel project with these env vars:

- `NEXT_PUBLIC_API_URL` → `https://<your-render-backend>.onrender.com`
- `NEXT_PUBLIC_WS_URL` → same (Socket.IO upgrades to WebSocket)

The frontend root is `apps/frontend`. The `vercel.json` at the repo root directs Vercel to build the Next.js app in that subdirectory.

Quick deploy:

```bash
# from repo root
npx vercel --yes --cwd apps/frontend
# on first run, link the project; then set env:
npx vercel env add NEXT_PUBLIC_API_URL production
npx vercel env add NEXT_PUBLIC_WS_URL production
npx vercel deploy --prod --cwd apps/frontend
```

## Post-deploy

Update the backend's `CORS_ORIGIN` env var to the Vercel production URL so browsers can talk to it. Then reload any open tabs and you're done.
