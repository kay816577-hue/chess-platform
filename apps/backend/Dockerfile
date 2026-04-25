ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/usr/local/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate
RUN apt-get update \
  && apt-get install -y --no-install-recommends stockfish openssl ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --no-frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @chess/backend exec prisma generate
RUN pnpm --filter @chess/backend build

FROM base AS runtime
ENV NODE_ENV=production
ENV STOCKFISH_PATH=/usr/games/stockfish
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
EXPOSE 4000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "cd apps/backend && npx prisma migrate deploy || npx prisma db push --accept-data-loss; node dist/main.js"]
