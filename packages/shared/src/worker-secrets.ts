export const WORKER_SECRET_KEYS = {
  OPENAI_API_KEY: "OPENAI_API_KEY",
} as const;

export type WorkerSecretKey = keyof typeof WORKER_SECRET_KEYS;

type WorkerSecretClient = {
  $executeRawUnsafe: (query: string) => Promise<unknown>;
  workerSecret: {
    upsert: (args: {
      where: { key: string };
      create: { key: string; value: string };
      update: { value: string };
    }) => Promise<unknown>;
    findUnique: (args: { where: { key: string } }) => Promise<{ value: string } | null>;
  };
};

export async function ensureWorkerSecretsTable(
  prisma: WorkerSecretClient
): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WorkerSecret" (
      "key" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WorkerSecret_pkey" PRIMARY KEY ("key")
    );
  `);
}

export async function upsertWorkerSecret(
  prisma: WorkerSecretClient,
  key: WorkerSecretKey,
  value: string | undefined | null
): Promise<boolean> {
  const trimmed = value?.trim();
  if (!trimmed) return false;

  await prisma.workerSecret.upsert({
    where: { key },
    create: { key, value: trimmed },
    update: { value: trimmed },
  });
  return true;
}

export async function loadWorkerSecret(
  prisma: WorkerSecretClient,
  key: WorkerSecretKey
): Promise<string | null> {
  await ensureWorkerSecretsTable(prisma);
  const row = await prisma.workerSecret.findUnique({ where: { key } });
  const trimmed = row?.value?.trim();
  return trimmed || null;
}

export async function syncWorkerSecretsFromEnv(
  prisma: WorkerSecretClient,
  env: NodeJS.ProcessEnv = process.env
): Promise<string[]> {
  await ensureWorkerSecretsTable(prisma);
  const synced: string[] = [];
  for (const key of Object.keys(WORKER_SECRET_KEYS) as WorkerSecretKey[]) {
    if (await upsertWorkerSecret(prisma, key, env[key])) {
      synced.push(key);
    }
  }
  return synced;
}
