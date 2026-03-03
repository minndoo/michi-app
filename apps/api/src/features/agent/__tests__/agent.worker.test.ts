import { describe, expect, it, vi } from "vitest";
import type { Job } from "bullmq";
import { processAgentJob } from "../agent.worker.js";
import type { AgentStreamEvent } from "../agent.types.js";

describe("agent worker", () => {
  it("publishes domain events unchanged and stores terminal result", async () => {
    const publishAgentEvent = vi.fn().mockResolvedValue(undefined);
    const updateAgentJobStatus = vi.fn().mockResolvedValue(undefined);
    const streamEvents: AgentStreamEvent[] = [
      {
        type: "router_started",
        jobId: "job-1",
        jobType: "message",
        threadId: "thread-1",
      },
      {
        type: "router_intent_resolved",
        jobId: "job-1",
        jobType: "message",
        threadId: "thread-1",
        routedIntent: "plan_goal",
      },
      {
        type: "planner_started",
        jobId: "job-1",
        jobType: "message",
        threadId: "thread-1",
      },
      {
        type: "planner_stage",
        jobId: "job-1",
        jobType: "message",
        threadId: "thread-1",
        stage: "intake",
        payload: {
          response: "Need more info.",
        },
      },
      {
        type: "planner_waiting",
        jobId: "job-1",
        jobType: "message",
        threadId: "thread-1",
      },
      {
        type: "result",
        jobId: "job-1",
        jobType: "message",
        threadId: "thread-1",
        response: {
          threadId: "thread-1",
          routedIntent: "plan_goal",
          response: "Need more info.",
        },
      },
    ];

    await processAgentJob(
      {
        id: "job-1",
        name: "message",
        data: {
          userId: "user-1",
          threadId: "thread-1",
          timezone: "Europe/Prague",
          message: "help me plan",
        },
      } as unknown as Job,
      {
        service: {
          runMessageStream: async function* () {
            for (const event of streamEvents) {
              yield event;
            }
          },
          continuePlanStream: async function* () {
            yield* [];
          },
        },
        publishAgentEvent,
        updateAgentJobStatus,
      },
    );

    expect(publishAgentEvent).toHaveBeenCalledWith({
      type: "run_started",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
    });
    expect(publishAgentEvent).toHaveBeenCalledWith(streamEvents[0]);
    expect(publishAgentEvent).toHaveBeenCalledWith(streamEvents[3]);
    expect(updateAgentJobStatus).toHaveBeenCalledWith({
      jobId: "job-1",
      jobType: "message",
      status: "completed",
      result: {
        threadId: "thread-1",
        routedIntent: "plan_goal",
        response: "Need more info.",
      },
    });
    expect(publishAgentEvent).toHaveBeenLastCalledWith({
      type: "done",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
    });
  });

  it("publishes failure lifecycle when processing errors", async () => {
    const publishAgentEvent = vi.fn().mockResolvedValue(undefined);
    const updateAgentJobStatus = vi.fn().mockResolvedValue(undefined);

    await expect(
      processAgentJob(
        {
          id: "job-2",
          name: "plan_goal",
          data: {
            userId: "user-1",
            threadId: "thread-1",
            timezone: "Europe/Prague",
            message: "three days a week",
          },
        } as unknown as Job,
        {
          service: {
            runMessageStream: async function* () {
              yield* [];
            },
            continuePlanStream: async function* () {
              yield* [];
              throw new Error("planner offline");
            },
          },
          publishAgentEvent,
          updateAgentJobStatus,
        },
      ),
    ).rejects.toThrow("planner offline");

    expect(publishAgentEvent).toHaveBeenCalledWith({
      type: "error",
      jobId: "job-2",
      jobType: "plan_goal",
      threadId: "thread-1",
      message: "planner offline",
    });
    expect(updateAgentJobStatus).toHaveBeenCalledWith({
      jobId: "job-2",
      jobType: "plan_goal",
      status: "failed",
      error: "planner offline",
    });
    expect(publishAgentEvent).toHaveBeenCalledWith({
      type: "done",
      jobId: "job-2",
      jobType: "plan_goal",
      threadId: "thread-1",
    });
  });
});
