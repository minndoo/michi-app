import { describe, expect, it, vi } from "vitest";
import { createRouterWorkflow } from "../router-workflow.js";

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
};

describe("createRouterWorkflow", () => {
  it("classifies plan_goal", async () => {
    const mockedInvoke = vi.fn().mockResolvedValue({
      intent: "plan_goal",
    });
    const mockedModel = {
      withStructuredOutput: vi.fn().mockReturnValue({
        invoke: mockedInvoke,
      }),
    } as never;

    const workflow = createRouterWorkflow({
      model: mockedModel,
    });

    const result = await workflow.invoke({
      threadId: "thread-1",
      userId: "user-1",
      referenceDate: "2026-03-02T00:00:00.000Z",
      timezone: "Europe/Warsaw",
      input: "Plan my running goal",
      intent: null,
    });

    expect(result.intent).toBe("plan_goal");
    expect(mockedInvoke).toHaveBeenCalledTimes(1);
  });

  it("does not perform intake extraction", async () => {
    const mockedInvoke = vi.fn().mockResolvedValue({
      intent: "show_tasks",
    });
    const mockedModel = {
      withStructuredOutput: vi.fn().mockReturnValue({
        invoke: mockedInvoke,
      }),
    } as never;

    const workflow = createRouterWorkflow({
      model: mockedModel,
    });

    const result = await workflow.invoke({
      threadId: "thread-1",
      userId: "user-1",
      referenceDate: "2026-03-02T00:00:00.000Z",
      timezone: "Europe/Warsaw",
      input: "show tasks",
      intent: null,
    });

    expect(result.intent).toBe("show_tasks");
    expect(result).not.toHaveProperty("accepted");
    expect(result).not.toHaveProperty("missingFields");
  });
});

describe("getOrInitRouterWorkflow", () => {
  it("caches a successful initialization", async () => {
    vi.resetModules();

    const mockedModel = {
      withStructuredOutput: vi.fn().mockReturnValue({
        invoke: vi.fn().mockResolvedValue({ intent: "show_tasks" }),
      }),
    };
    const mockedCreateFastModel = vi.fn().mockReturnValue(mockedModel);
    const mockedGetOrInitCheckpointer = vi.fn().mockResolvedValue({});

    vi.doMock("../../../models/fast-model.js", () => ({
      createFastModel: mockedCreateFastModel,
    }));
    vi.doMock("../../../persistence/checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));

    const { getOrInitRouterWorkflow } = await import("../router-workflow.js");

    const first = await getOrInitRouterWorkflow();
    const second = await getOrInitRouterWorkflow();

    expect(first).toBe(second);
    expect(mockedCreateFastModel).toHaveBeenCalledTimes(1);
    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight initialization", async () => {
    vi.resetModules();

    const gate = createDeferred<object>();
    const mockedCreateFastModel = vi.fn().mockResolvedValue({
      withStructuredOutput: vi.fn().mockReturnValue({
        invoke: vi.fn().mockResolvedValue({ intent: "show_tasks" }),
      }),
    });
    const mockedGetOrInitCheckpointer = vi
      .fn()
      .mockImplementation(() => gate.promise);

    vi.doMock("../../../models/fast-model.js", () => ({
      createFastModel: mockedCreateFastModel,
    }));
    vi.doMock("../../../persistence/checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));

    const { getOrInitRouterWorkflow } = await import("../router-workflow.js");

    const first = getOrInitRouterWorkflow();
    const second = getOrInitRouterWorkflow();

    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(1);

    gate.resolve({});

    await expect(first).resolves.toBe(await second);
    expect(mockedCreateFastModel).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed initialization", async () => {
    vi.resetModules();

    const mockedCreateFastModel = vi.fn().mockReturnValue({
      withStructuredOutput: vi.fn().mockReturnValue({
        invoke: vi.fn().mockResolvedValue({ intent: "show_tasks" }),
      }),
    });
    const mockedGetOrInitCheckpointer = vi
      .fn()
      .mockRejectedValueOnce(new Error("redis offline"))
      .mockResolvedValue({});

    vi.doMock("../../../models/fast-model.js", () => ({
      createFastModel: mockedCreateFastModel,
    }));
    vi.doMock("../../../persistence/checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));

    const { getOrInitRouterWorkflow } = await import("../router-workflow.js");

    await expect(getOrInitRouterWorkflow()).rejects.toThrow("redis offline");
    await expect(getOrInitRouterWorkflow()).resolves.toBeDefined();
    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(2);
  });
});
