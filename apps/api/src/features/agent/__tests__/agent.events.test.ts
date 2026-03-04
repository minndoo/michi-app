import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedPublish = vi.fn();
const mockedGetOrInitRedisCommandClient = vi.fn().mockResolvedValue({
  publish: mockedPublish,
});
const mockedGetOrInitRedisSubscriberClient = vi.fn();

vi.mock("../../../lib/redis.js", () => ({
  getOrInitRedisCommandClient: mockedGetOrInitRedisCommandClient,
  getOrInitRedisSubscriberClient: mockedGetOrInitRedisSubscriberClient,
}));

describe("agent events", () => {
  beforeEach(() => {
    mockedPublish.mockReset();
    mockedGetOrInitRedisCommandClient.mockClear();
  });

  it("publishes agent events through the shared command client", async () => {
    const { publishAgentEvent } = await import("../agent.events.js");

    await publishAgentEvent({
      type: "router_started",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
    });

    expect(mockedGetOrInitRedisCommandClient).toHaveBeenCalledTimes(1);
    expect(mockedPublish).toHaveBeenCalledWith(
      "agent:message:job-1:events",
      JSON.stringify({
        type: "router_started",
        jobId: "job-1",
        jobType: "message",
        threadId: "thread-1",
      }),
    );
  });
});
