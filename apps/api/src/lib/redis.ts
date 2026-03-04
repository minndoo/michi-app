import { createClient } from "redis";
import type { QueueOptions } from "bullmq";
import { AgentInfrastructureError } from "../features/agent/agent.errors.js";

let commandClient: ReturnType<typeof createClient> | null = null;
let commandClientPromise: Promise<ReturnType<typeof createClient>> | null =
  null;
let subscriberClient: ReturnType<typeof createClient> | null = null;
let subscriberClientPromise: Promise<ReturnType<typeof createClient>> | null =
  null;

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const createConnectedClient = async () => {
  const client = createClient({ url: redisUrl });
  await client.connect();
  return client;
};

const logRedisError = (error: unknown, message: string) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(message, { error: errorMessage });
};

export const getOrInitRedisCommandClient = async () => {
  if (commandClient) {
    return commandClient;
  }

  if (!commandClientPromise) {
    commandClientPromise = createConnectedClient()
      .then((client) => {
        commandClient = client;
        return client;
      })
      .catch((error) => {
        logRedisError(error, "Agent Redis initialization failed");
        throw new AgentInfrastructureError();
      })
      .finally(() => {
        commandClientPromise = null;
      });
  }

  return commandClientPromise;
};

export const getOrInitRedisSubscriberClient = async () => {
  if (subscriberClient) {
    return subscriberClient;
  }

  if (!subscriberClientPromise) {
    subscriberClientPromise = createConnectedClient()
      .then((client) => {
        subscriberClient = client;
        return client;
      })
      .catch((error) => {
        logRedisError(error, "Agent Redis subscriber initialization failed");
        throw new AgentInfrastructureError();
      })
      .finally(() => {
        subscriberClientPromise = null;
      });
  }

  return subscriberClientPromise;
};

export const getBullmqConnectionOptions = (): QueueOptions["connection"] => {
  const url = new URL(redisUrl);
  const db = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0;

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(Number.isNaN(db) ? {} : { db }),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
};
