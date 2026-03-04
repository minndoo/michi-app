import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  add,
  waitUntilReady,
  queueConstructor,
  createInitialJobState,
  getBullmqConnectionOptions,
} = vi.hoisted(() => {
  const add = vi.fn();
  const waitUntilReady = vi.fn().mockResolvedValue(undefined);
  const queueConstructor = vi.fn().mockImplementation(() => ({
    add,
    waitUntilReady,
  }));

  return {
    add,
    waitUntilReady,
    queueConstructor,
    createInitialJobState: vi.fn().mockResolvedValue(undefined),
    getBullmqConnectionOptions: vi.fn().mockReturnValue({
      host: "localhost",
      port: 6379,
    }),
  };
});

vi.mock("bullmq", () => ({
  Queue: queueConstructor,
}));

vi.mock("../../../lib/redis.js", () => ({
  getBullmqConnectionOptions,
}));

vi.mock("../agent.events.js", () => ({
  createInitialJobState,
}));

describe("AgentQueueService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    waitUntilReady.mockResolvedValue(undefined);
    getBullmqConnectionOptions.mockReturnValue({
      host: "localhost",
      port: 6379,
    });
  });

  it("enqueues questionAnswer in the BullMQ payload", async () => {
    add.mockResolvedValueOnce({ id: "job-1" });

    const { AgentQueueService } = await import("../agent.queue.js");
    const service = new AgentQueueService({
      createInitialJobState,
    });

    await expect(
      service.enqueue("plan_goal", "user-1", {
        threadId: "thread-1",
        message: "I can run 1km",
        questionAnswer: {
          field: "baseline",
          answer: "I can run 1km",
        },
        timezone: "Europe/Prague",
      }),
    ).resolves.toEqual({
      threadId: "thread-1",
      jobId: "job-1",
    });

    expect(add).toHaveBeenCalledWith("plan_goal", {
      userId: "user-1",
      threadId: "thread-1",
      timezone: "Europe/Prague",
      message: "I can run 1km",
      questionAnswer: {
        field: "baseline",
        answer: "I can run 1km",
      },
    });
  });

  it("normalizes missing questionAnswer to null", async () => {
    add.mockResolvedValueOnce({ id: "job-2" });

    const { AgentQueueService } = await import("../agent.queue.js");
    const service = new AgentQueueService({
      createInitialJobState,
    });

    await expect(
      service.enqueue("message", "user-1", {
        threadId: "thread-2",
        message: "show tasks",
        timezone: "Europe/Prague",
      }),
    ).resolves.toEqual({
      threadId: "thread-2",
      jobId: "job-2",
    });

    expect(add).toHaveBeenCalledWith("message", {
      userId: "user-1",
      threadId: "thread-2",
      timezone: "Europe/Prague",
      message: "show tasks",
      questionAnswer: null,
    });
  });
});
