import { describe, expect, it, vi } from "vitest";
import type { Job } from "bullmq";
import { processAgentJob } from "../agent.worker.js";
import type { AgentStreamEvent } from "../agent.types.js";

describe("agent worker", () => {
  it("publishes domain events unchanged and stores terminal result", async () => {
    const publishAgentEvent = vi.fn().mockResolvedValue(undefined);
    const updateAgentJobStatus = vi.fn().mockResolvedValue(undefined);
    const runMessageStream = vi.fn(async function* (
      _userId: string,
      _jobId: string,
      _input,
    ) {
      for (const event of streamEvents) {
        yield event;
      }
    });
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
        stage: "intake",
        question: {
          stage: "intake",
          question: {
            field: "daysWeeklyFrequency",
            question: "How many days per week can you work on this?",
          },
          placeholder: "Example: 3 days per week",
          inputHint: "days_per_week",
        },
      },
      {
        type: "result",
        jobId: "job-1",
        jobType: "message",
        threadId: "thread-1",
        response: {
          threadId: "thread-1",
          routedIntent: "plan_goal",
          response: "How many days per week can you work on this?",
          plannerQuestion: {
            stage: "intake",
            question: {
              field: "daysWeeklyFrequency",
              question: "How many days per week can you work on this?",
            },
            placeholder: "Example: 3 days per week",
            inputHint: "days_per_week",
          },
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
          questionAnswer: {
            field: "goal",
            answer: "help me plan",
          },
        },
      } as unknown as Job,
      {
        service: {
          runMessageStream,
          continuePlanStream: async function* () {
            yield* [];
          },
        },
        publishAgentEvent,
        updateAgentJobStatus,
      },
    );

    expect(runMessageStream).toHaveBeenCalledWith("user-1", "job-1", {
      threadId: "thread-1",
      message: "help me plan",
      questionAnswer: {
        field: "goal",
        answer: "help me plan",
      },
      timezone: "Europe/Prague",
    });

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
        response: "How many days per week can you work on this?",
        plannerQuestion: {
          stage: "intake",
          question: {
            field: "daysWeeklyFrequency",
            question: "How many days per week can you work on this?",
          },
          placeholder: "Example: 3 days per week",
          inputHint: "days_per_week",
        },
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
    const continuePlanStream = vi.fn(async function* (
      _userId: string,
      _jobId: string,
      _input,
    ) {
      yield* [];
      throw new Error("planner offline");
    });

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
            questionAnswer: {
              field: "daysWeeklyFrequency",
              answer: "three days a week",
            },
          },
        } as unknown as Job,
        {
          service: {
            runMessageStream: async function* () {
              yield* [];
            },
            continuePlanStream,
          },
          publishAgentEvent,
          updateAgentJobStatus,
        },
      ),
    ).rejects.toThrow("planner offline");

    expect(continuePlanStream).toHaveBeenCalledWith("user-1", "job-2", {
      threadId: "thread-1",
      message: "three days a week",
      questionAnswer: {
        field: "daysWeeklyFrequency",
        answer: "three days a week",
      },
      timezone: "Europe/Prague",
    });

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
