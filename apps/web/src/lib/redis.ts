import { Queue } from "bullmq";

const QUEUE_NAME = "render-reel";

function getConnectionOptions() {
  const url = process.env.REDIS_URL;
  if (!url) {
    return {
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: null as null,
    };
  }

  const parsed = new URL(url);
  const isTls = parsed.protocol === "rediss:";

  return {
    host: parsed.hostname || "localhost",
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: isTls ? {} : undefined,
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
