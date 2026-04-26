ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN npm install -g yarn@1.22.22 --force
WORKDIR /app

FROM base AS deps
COPY package.json yarn.lock* ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN yarn install --network-timeout 300000

FROM deps AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_WS_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN yarn workspace @chess/frontend build

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=build /app/apps/frontend/public ./apps/frontend/public
COPY --from=build /app/apps/frontend/package.json ./apps/frontend/package.json
COPY --from=build /app/package.json ./
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["yarn", "workspace", "@chess/frontend", "start"]
