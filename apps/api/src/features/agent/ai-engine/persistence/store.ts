import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";

let store: PostgresStore | null = null;
let initPromise: Promise<PostgresStore> | null = null;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
};

export const getOrInitStore = async (): Promise<PostgresStore> => {
  if (store) {
    return store;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const connectionString = process.env.DATABASE_URL;

      if (!connectionString) {
        const error = new Error("DATABASE_URL must be set");

        console.error("AI engine Postgres initialization failed", {
          error: getErrorMessage(error),
        });

        throw error;
      }

      try {
        const createdStore = PostgresStore.fromConnString(connectionString, {
          ensureTables: true,
        });

        await createdStore.setup();
        store = createdStore;

        return createdStore;
      } catch (error) {
        console.error("AI engine Postgres initialization failed", {
          error: getErrorMessage(error),
        });

        throw error;
      }
    })().finally(() => {
      initPromise = null;
    });
  }

  return initPromise;
};
