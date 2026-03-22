# IssueLab Status - Production Dockerfile
# Self-contained build for Railway / cloud deployment

# Stage 1: Build frontend (needs devDependencies)
FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
COPY .npmrc package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt update && \
    apt --yes --no-install-recommends install \
        iputils-ping \
        dumb-init \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
COPY .npmrc package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy app source and built frontend from build stage
COPY . .
COPY --from=build /app/dist ./dist

RUN mkdir -p ./data

EXPOSE 3001

HEALTHCHECK --interval=60s --timeout=30s --start-period=180s --retries=5 \
    CMD curl -f http://localhost:3001/api/entry-page || exit 1

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
