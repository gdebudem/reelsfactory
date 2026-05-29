# Worker image for Railway — ffmpeg render (1 GB RAM, no Chrome)
FROM node:20-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  fonts-liberation \
  fonts-noto-core \
  fontconfig \
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
  && test -x node_modules/.bin/tsx

ENV NODE_ENV=production

CMD ["npm", "run", "worker"]
