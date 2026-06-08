-- v3 pipeline: AI scene images + step-by-step progress
ALTER TABLE "ReelJob" ADD COLUMN IF NOT EXISTS "sceneImagesJson" JSONB;
ALTER TABLE "ReelJob" ADD COLUMN IF NOT EXISTS "progressJson" JSONB;
