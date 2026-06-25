FROM node:22-alpine

WORKDIR /app

# Copy manifests first so npm ci is cached unless deps change
COPY package*.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
COPY packages/sweep/package.json packages/sweep/
COPY packages/web/package.json packages/web/

RUN npm ci

# Copy source after deps so code changes don't bust the cache
COPY packages/ packages/
