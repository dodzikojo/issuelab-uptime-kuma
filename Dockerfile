# IssueLab Status - Production Dockerfile
# Self-contained build for Railway / cloud deployment

FROM node:22-bookworm-slim AS build

WORKDIR /app

# Install system dependencies
RUN apt update && \
    apt --yes --no-install-recommends install \
        iputils-ping \
        dumb-init \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install Node dependencies
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Build frontend
RUN npm run build

# Create data directory
RUN mkdir -p ./data

EXPOSE 3001

HEALTHCHECK --interval=60s --timeout=30s --start-period=180s --retries=5 \
    CMD curl -f http://localhost:3001/api/entry-page || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server/server.js"]
