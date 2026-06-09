import type { PrismaClient } from "@prisma/client";
import {
  createInitialProgress,
  parsePipelineProgress,
  pipelineProgressSchema,
  type PipelineLogEntry,
  type PipelineLogKind,
  type PipelineProgress,
} from "@reels-factory/shared";

type ProgressMeta = Omit<PipelineProgress, "logs">;

function rowToEntry(row: {
  at: Date;
  text: string;
  kind: string | null;
  meta: unknown;
}): PipelineLogEntry {
  const entry: PipelineLogEntry = {
    at: row.at.toISOString(),
    text: row.text,
  };
  if (row.kind) entry.kind = row.kind as PipelineLogKind;
  if (row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)) {
    entry.meta = row.meta as PipelineLogEntry["meta"];
  }
  return entry;
}

export function stripLogs(progress: PipelineProgress): ProgressMeta {
  const { logs: _logs, ...meta } = progress;
  return meta;
}

export async function loadProgressMeta(
  prisma: PrismaClient,
  reelJobId: string
): Promise<ProgressMeta> {
  const job = await prisma.reelJob.findUnique({
    where: { id: reelJobId },
    select: { progressJson: true },
  });
  const progress = parsePipelineProgress(
    job?.progressJson ?? createInitialProgress()
  );
  return stripLogs(progress);
}

export async function saveProgressMeta(
  prisma: PrismaClient,
  reelJobId: string,
  meta: ProgressMeta
): Promise<void> {
  await prisma.reelJob.update({
    where: { id: reelJobId },
    data: {
      progressJson: {
        ...meta,
        updatedAt: new Date().toISOString(),
      },
    },
  });
}

export async function appendJobLogEntry(
  prisma: PrismaClient,
  reelJobId: string,
  entry: PipelineLogEntry
): Promise<void> {
  await prisma.jobPipelineLog.create({
    data: {
      reelJobId,
      at: new Date(entry.at),
      text: entry.text,
      kind: entry.kind ?? null,
      meta: entry.meta ?? undefined,
    },
  });
}

export async function appendManyJobLogEntries(
  prisma: PrismaClient,
  reelJobId: string,
  entries: PipelineLogEntry[]
): Promise<void> {
  if (entries.length === 0) return;
  await prisma.jobPipelineLog.createMany({
    data: entries.map((entry) => ({
      reelJobId,
      at: new Date(entry.at),
      text: entry.text,
      kind: entry.kind ?? null,
      meta: entry.meta ?? undefined,
    })),
  });
}

export async function fetchJobLogEntries(
  prisma: PrismaClient,
  reelJobId: string
): Promise<PipelineLogEntry[]> {
  const rows = await prisma.jobPipelineLog.findMany({
    where: { reelJobId },
    orderBy: { at: "asc" },
  });
  return rows.map(rowToEntry);
}

export async function countJobLogEntries(
  prisma: PrismaClient,
  reelJobId: string
): Promise<number> {
  return prisma.jobPipelineLog.count({ where: { reelJobId } });
}

export async function seedJobLogsFromProgress(
  prisma: PrismaClient,
  reelJobId: string,
  logs: PipelineLogEntry[]
): Promise<void> {
  if (logs.length === 0) return;
  const existing = await prisma.jobPipelineLog.count({
    where: { reelJobId },
  });
  if (existing > 0) return;
  await appendManyJobLogEntries(prisma, reelJobId, logs);
}

export async function hydrateProgressLogs(
  prisma: PrismaClient,
  reelJobId: string,
  rawProgress?: unknown
): Promise<PipelineProgress> {
  const parsed = parsePipelineProgress(rawProgress ?? createInitialProgress());
  await seedJobLogsFromProgress(prisma, reelJobId, parsed.logs);
  const logs = await fetchJobLogEntries(prisma, reelJobId);
  return pipelineProgressSchema.parse({
    ...stripLogs(parsed),
    logs,
  });
}

/** Apply a pure progress mutation, persist meta + any new log lines atomically per log insert. */
export async function mutateJobProgress(
  prisma: PrismaClient,
  reelJobId: string,
  mutate: (progress: PipelineProgress) => PipelineProgress
): Promise<PipelineProgress> {
  const meta = await loadProgressMeta(prisma, reelJobId);
  const before = pipelineProgressSchema.parse({ ...meta, logs: [] });
  const after = mutate(before);
  const newLogs = after.logs;
  await saveProgressMeta(prisma, reelJobId, stripLogs(after));
  for (const entry of newLogs) {
    await appendJobLogEntry(prisma, reelJobId, entry);
  }
  return hydrateProgressLogs(prisma, reelJobId, stripLogs(after));
}

export async function persistJobLog(
  prisma: PrismaClient,
  reelJobId: string,
  text: string,
  kind?: PipelineLogKind,
  meta?: Record<string, unknown>
): Promise<void> {
  await appendJobLogEntry(prisma, reelJobId, {
    at: new Date().toISOString(),
    text,
    ...(kind ? { kind } : {}),
    ...(meta ? { meta: meta as PipelineLogEntry["meta"] } : {}),
  });
}

export async function jobHasLogText(
  prisma: PrismaClient,
  reelJobId: string,
  needle: string
): Promise<boolean> {
  const hit = await prisma.jobPipelineLog.findFirst({
    where: { reelJobId, text: { contains: needle } },
    select: { id: true },
  });
  return Boolean(hit);
}
