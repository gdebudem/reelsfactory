# Worker image for Railway — Remotion Chrome Headless Shell
FROM node:20-bookworm

WORKDIR /app

# https://www.remotion.dev/docs/miscellaneous/linux-dependencies (Debian)
RUN apt-get update && apt-get install -y --no-install-recommends \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libasound2 \
  libxrandr2 \
  libxkbcommon0 \
  libxfixes3 \
  libxcomposite1 \
  libxdamage1 \
  libgbm1 \
  libcups2 \
  libcairo2 \
  libpango-1.0-0 \
  libglib2.0-0 \
  libx11-6 \
  libxcb1 \
  libxext6 \
  libxrender1 \
  libxi6 \
  fonts-liberation \
  fonts-noto-core \
  ca-certificates \
  ffmpeg \
  && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_OPTIONS=--max-old-space-size=768
ENV NPM_CONFIG_PRODUCTION=false

COPY package.json package-lock.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ai-script/package.json ./packages/ai-script/
COPY packages/product-parser/package.json ./packages/product-parser/
COPY packages/video-templates/package.json ./packages/video-templates/

RUN npm ci --legacy-peer-deps

COPY prisma ./prisma
COPY packages ./packages
COPY apps/worker ./apps/worker

RUN npx prisma generate --schema=./prisma/schema.prisma \
  && npx remotion browser ensure \
  && test -x node_modules/.bin/tsx

ENV NODE_ENV=production

CMD ["npm", "run", "worker"]
