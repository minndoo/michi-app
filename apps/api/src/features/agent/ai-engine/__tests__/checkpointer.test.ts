import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromUrl } = vi.hoisted(() => ({
  fromUrl: vi.fn(),
}));

vi.mock("@langchain/langgraph-checkpoint-redis", () => ({
  RedisSaver: {
    fromUrl,
  },
}));

const loadModule = async () => import("../checkpointer.js");

describe("getOrInitCheckpointer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    fromUrl.mockReset();
  });

  it("logs Redis initialization failures and rethrows them", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const error = new Error("redis offline");
    const { getOrInitCheckpointer } = await loadModule();

    fromUrl.mockRejectedValueOnce(error);

    await expect(getOrInitCheckpointer()).rejects.toBe(error);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
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

    fromUrl.mockImplementationOnce(() => deferred.promise);

    const first = getOrInitCheckpointer();
    const second = getOrInitCheckpointer();

    expect(fromUrl).toHaveBeenCalledTimes(1);

    deferred.resolve(checkpointer);

    await expect(first).resolves.toBe(checkpointer);
    await expect(second).resolves.toBe(checkpointer);
    await expect(getOrInitCheckpointer()).resolves.toBe(checkpointer);
    expect(fromUrl).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed initialization", async () => {
    const firstError = new Error("redis offline");
    const checkpointer = { saver: true };
    const { getOrInitCheckpointer } = await loadModule();

    fromUrl
      .mockRejectedValueOnce(firstError)
      .mockResolvedValueOnce(checkpointer);

    await expect(getOrInitCheckpointer()).rejects.toBe(firstError);
    await expect(getOrInitCheckpointer()).resolves.toBe(checkpointer);
    expect(fromUrl).toHaveBeenCalledTimes(2);
  });
});
