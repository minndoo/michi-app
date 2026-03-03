import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enqueueAgentRun,
  isWaitingPlannerResponse,
  streamAgentRun,
} from "./agentStream";

describe("agentStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects waiting planner responses", () => {
    expect(
      isWaitingPlannerResponse({
        threadId: "thread-1",
        routedIntent: "plan_goal",
        response: "Need more info.",
      }),
    ).toBe(true);

    expect(
      isWaitingPlannerResponse({
        threadId: "thread-1",
        routedIntent: "plan_goal",
        plannerAction: "create_plan",
        response: "Done.",
      }),
    ).toBe(false);
  });

  it("parses SSE events from the stream", async () => {
    const encoder = new TextEncoder();
    const onEvent = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                'event: router_started\ndata: {"type":"router_started","jobId":"job-1","jobType":"message","threadId":"thread-1"}\n\n',
              ),
            );
            controller.enqueue(
              encoder.encode(
                'event: result\ndata: {"type":"result","jobId":"job-1","jobType":"message","response":{"threadId":"thread-1","routedIntent":"show_tasks","response":"Here are your tasks."}}\n\n',
              ),
            );
            controller.close();
          },
        }),
        headers: new Headers({
          "content-type": "text/event-stream",
        }),
      }),
    );

    await streamAgentRun({
      jobId: "job-1",
      jobType: "message",
      onEvent,
    });

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenNthCalledWith(1, {
      type: "router_started",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
    });
    expect(onEvent).toHaveBeenNthCalledWith(2, {
      type: "result",
      jobId: "job-1",
      jobType: "message",
      response: {
        threadId: "thread-1",
        routedIntent: "show_tasks",
        response: "Here are your tasks.",
      },
    });
  });

  it("enqueues an agent run before streaming", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          threadId: "thread-1",
          jobId: "job-1",
        }),
        headers: new Headers({
          "content-type": "application/json",
        }),
      }),
    );

    await expect(
      enqueueAgentRun({
        input: {
          threadId: "thread-1",
          message: "show tasks",
          timezone: "Europe/Prague",
        },
        jobType: "message",
      }),
    ).resolves.toEqual({
      threadId: "thread-1",
      jobId: "job-1",
    });
  });
});
