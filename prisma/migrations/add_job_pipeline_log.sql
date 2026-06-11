-- Persistent pipeline log rows (worker + web appendJobLog)
CREATE TABLE IF NOT EXISTS "JobPipelineLog" (
  "id" TEXT NOT NULL,
  "reelJobId" TEXT NOT NULL,
  "at" TIMESTAMP(3) NOT NULL,
  "text" TEXT NOT NULL,
  "kind" TEXT,
  "meta" JSONB,
  CONSTRAINT "JobPipelineLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobPipelineLog_reelJobId_at_idx"
  ON "JobPipelineLog"("reelJobId", "at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'JobPipelineLog_reelJobId_fkey'
  ) THEN
    ALTER TABLE "JobPipelineLog"
      ADD CONSTRAINT "JobPipelineLog_reelJobId_fkey"
      FOREIGN KEY ("reelJobId") REFERENCES "ReelJob"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
