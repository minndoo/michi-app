import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";

let checkpointer: RedisSaver | null = null;
let initPromise: Promise<RedisSaver> | null = null;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
};

export const getOrInitCheckpointer = async (): Promise<RedisSaver> => {
  if (checkpointer) {
    return checkpointer;
  }

  if (!initPromise) {
    const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

    initPromise = RedisSaver.fromUrl(redisUrl)
      .then((createdCheckpointer) => {
        checkpointer = createdCheckpointer;

        return createdCheckpointer;
      })
      .catch((error: unknown) => {
        console.error("AI engine Redis initialization failed", {
          error: getErrorMessage(error),
          redisUrl,
        });

        throw error;
      })
      .finally(() => {
        initPromise = null;
      });
  }

  return initPromise;
};
