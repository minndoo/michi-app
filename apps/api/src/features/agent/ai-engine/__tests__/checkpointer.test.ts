import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromUrl: mockedFromUrl } = vi.hoisted(() => ({
  fromUrl: vi.fn(),
}));

vi.mock("@langchain/langgraph-checkpoint-redis", () => ({
  RedisSaver: {
    fromUrl: mockedFromUrl,
  },
}));

const loadModule = async () => import("../checkpointer.js");

describe("getOrInitCheckpointer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    mockedFromUrl.mockReset();
  });

  it("logs Redis initialization failures and rethrows them", async () => {
    const mockedConsoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const error = new Error("redis offline");
    const { getOrInitCheckpointer } = await loadModule();

    mockedFromUrl.mockRejectedValueOnce(error);

    await expect(getOrInitCheckpointer()).rejects.toBe(error);
    expect(mockedConsoleErrorSpy).toHaveBeenCalledWith(
      "AI engine Redis initialization failed",
      expect.objectContaining({
        error: "redis offline",
        redisUrl: "redis://127.0.0.1:6379",
      }),
    );
  });

  it("shares one in-flight initialization and caches success", async () => {
    const checkpointer = { saver: true };
    const deferred = Promise.withResolvers<typeof checkpointer>();
    const { getOrInitCheckpointer } = await loadModule();

    mockedFromUrl.mockImplementationOnce(() => deferred.promise);

    const first = getOrInitCheckpointer();
    const second = getOrInitCheckpointer();

    expect(mockedFromUrl).toHaveBeenCalledTimes(1);

    deferred.resolve(checkpointer);

    await expect(first).resolves.toBe(checkpointer);
    await expect(second).resolves.toBe(checkpointer);
    await expect(getOrInitCheckpointer()).resolves.toBe(checkpointer);
    expect(mockedFromUrl).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed initialization", async () => {
    const firstError = new Error("redis offline");
    const checkpointer = { saver: true };
    const { getOrInitCheckpointer } = await loadModule();

    mockedFromUrl
      .mockRejectedValueOnce(firstError)
      .mockResolvedValueOnce(checkpointer);

    await expect(getOrInitCheckpointer()).rejects.toBe(firstError);
    await expect(getOrInitCheckpointer()).resolves.toBe(checkpointer);
    expect(mockedFromUrl).toHaveBeenCalledTimes(2);
  });
});
