# syntax=docker/dockerfile:1

# AdonisJS 7 requires Node 24. Native modules (better-sqlite3) need build tools.
FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# ---- install all dependencies (incl. dev, for building) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- compile TypeScript -> build/ ----
FROM deps AS build
COPY . .
# Dummy env just to satisfy env validation during the build step.
ENV NODE_ENV=production \
    APP_KEY=build_time_placeholder_key_0123456789 \
    PORT=3333 \
    HOST=0.0.0.0 \
    LOG_LEVEL=info
RUN node ace build

# ---- runtime image ----
FROM base AS production
ENV NODE_ENV=production
# Install production-only deps FIRST (cached across source changes; better-sqlite3
# is recompiled here — build tools are present in the base image).
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev \
  && mkdir -p /app/tmp
# Then drop in the compiled app (build/ contains bin/, ace.js, compiled TS).
# node_modules is not part of build/, so this does not clobber the deps above.
COPY --from=build /app/build /app
EXPOSE 3333
CMD ["node", "bin/server.js"]
