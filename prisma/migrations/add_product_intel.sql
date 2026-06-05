-- Run once in Neon SQL Editor (or: DATABASE_URL=<neon-url> npm run db:push)
ALTER TABLE "ReelJob" ADD COLUMN IF NOT EXISTS "productIntelJson" JSONB;
