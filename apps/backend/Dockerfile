ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN npm install -g yarn@1.22.22 --force
RUN apt-get update \
  && apt-get install -y --no-install-recommends stockfish openssl ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json yarn.lock* ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN yarn install --network-timeout 300000

FROM deps AS build
COPY . .
RUN yarn workspace @chess/backend exec -- prisma generate
RUN yarn workspace @chess/backend build

FROM base AS runtime
ENV NODE_ENV=production
ENV STOCKFISH_PATH=/usr/games/stockfish
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/package.json ./
EXPOSE 4000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "cd apps/backend && npx prisma migrate deploy && node dist/main.js"]
