# Worker image for Railway — ffmpeg render + Playwright parser
FROM node:20-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  fonts-liberation \
  fonts-noto-core \
  fontconfig \
  ca-certificates \
  ffmpeg \
  libass9 \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_OPTIONS=--max-old-space-size=768
ENV NPM_CONFIG_PRODUCTION=false
ENV PLAYWRIGHT_PARSER=true

COPY package.json package-lock.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ai-script/package.json ./packages/ai-script/
COPY packages/product-parser/package.json ./packages/product-parser/
COPY packages/product-intel/package.json ./packages/product-intel/
COPY packages/video-templates/package.json ./packages/video-templates/

RUN npm ci --legacy-peer-deps

COPY prisma ./prisma
COPY packages ./packages
COPY apps/worker ./apps/worker

RUN npx prisma generate --schema=./prisma/schema.prisma \
  && test -x node_modules/.bin/tsx \
  && npx playwright install chromium --with-deps \
  && chmod +x apps/worker/scripts/generate-music.sh \
  && apps/worker/scripts/generate-music.sh

ENV NODE_ENV=production

CMD ["npm", "run", "worker"]
