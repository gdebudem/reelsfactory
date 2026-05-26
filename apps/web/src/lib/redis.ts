import { Queue } from "bullmq";

const QUEUE_NAME = "render-reel";

function getConnectionOptions() {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: Number(parsed.port || 6379),
    maxRetriesPerRequest: null as null,
  };
}

let renderQueue: Queue | null = null;

export function getRenderQueue() {
  if (!renderQueue) {
    renderQueue = new Queue(QUEUE_NAME, {
      connection: getConnectionOptions(),
    });
  }
  return renderQueue;
}
