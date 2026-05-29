# Worker image for Railway — Remotion + Chromium
FROM node:20-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium \
  ffmpeg \
  fonts-liberation \
  python3 \
  make \
  g++ \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libdbus-1-3 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpango-1.0-0 \
  libcairo2 \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV REMOTION_CHROME_EXECUTABLE=/usr/bin/chromium
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
  && test -x node_modules/.bin/tsx

ENV NODE_ENV=production

CMD ["npm", "run", "worker"]
