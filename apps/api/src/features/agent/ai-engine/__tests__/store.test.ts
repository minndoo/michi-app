import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromConnString: mockedFromConnString } = vi.hoisted(() => ({
  fromConnString: vi.fn(),
}));

vi.mock("@langchain/langgraph-checkpoint-postgres/store", () => ({
  PostgresStore: {
    fromConnString: mockedFromConnString,
  },
}));

const loadModule = async () => import("../store.js");

describe("getOrInitStore", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    mockedFromConnString.mockReset();
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("logs missing DATABASE_URL and throws", async () => {
    const mockedConsoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { getOrInitStore } = await loadModule();

    delete process.env.DATABASE_URL;

    await expect(getOrInitStore()).rejects.toThrow(
      "POSTGRES_URL or DATABASE_URL must be set",
    );
    expect(mockedConsoleErrorSpy).toHaveBeenCalledWith(
      "AI engine Postgres initialization failed",
      expect.objectContaining({
        error: "POSTGRES_URL or DATABASE_URL must be set",
      }),
    );
  });

  it("logs Postgres setup failures and rethrows them", async () => {
    const mockedConsoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const error = new Error("postgres offline");
    const { getOrInitStore } = await loadModule();

    process.env.DATABASE_URL = "postgres://db";
    mockedFromConnString.mockReturnValue({
      setup: vi.fn().mockRejectedValueOnce(error),
    });

    await expect(getOrInitStore()).rejects.toBe(error);
    expect(mockedConsoleErrorSpy).toHaveBeenCalledWith(
      "AI engine Postgres initialization failed",
      expect.objectContaining({
        error: "postgres offline",
      }),
    );
  });

  it("shares one in-flight initialization and caches success", async () => {
    process.env.DATABASE_URL = "postgres://db";
    const store = {
      setup: vi.fn().mockResolvedValue(undefined),
    };
    const { getOrInitStore } = await loadModule();

    mockedFromConnString.mockReturnValue(store);

    const first = getOrInitStore();
    const second = getOrInitStore();

    await expect(first).resolves.toBe(store);
    await expect(second).resolves.toBe(store);
    await expect(getOrInitStore()).resolves.toBe(store);
    expect(mockedFromConnString).toHaveBeenCalledTimes(1);
    expect(store.setup).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed initialization", async () => {
    process.env.DATABASE_URL = "postgres://db";
    const error = new Error("postgres offline");
    const workingStore = {
      setup: vi.fn().mockResolvedValue(undefined),
    };
    const { getOrInitStore } = await loadModule();

    mockedFromConnString
      .mockReturnValueOnce({
        setup: vi.fn().mockRejectedValueOnce(error),
      })
      .mockReturnValueOnce(workingStore);

    await expect(getOrInitStore()).rejects.toBe(error);
    await expect(getOrInitStore()).resolves.toBe(workingStore);
    expect(mockedFromConnString).toHaveBeenCalledTimes(2);
  });
});
