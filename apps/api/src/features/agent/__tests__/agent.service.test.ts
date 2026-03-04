import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../ai-engine/index.js", () => ({
  aiEngine: {
    streamPlanner: vi.fn(),
    streamRouter: vi.fn(),
  },
}));
import { AgentService } from "../agent.service.js";
import type { AgentStreamEvent } from "../agent.types.js";

describe("AgentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams message domain events through the engine", async () => {
    const events: AgentStreamEvent[] = [
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
        routedIntent: "show_tasks",
      },
      {
        type: "result",
        jobId: "job-1",
        jobType: "message",
        threadId: "thread-1",
        response: {
          threadId: "thread-1",
          routedIntent: "show_tasks",
          response: "Here are your tasks.",
        },
      },
    ];

    const service = new AgentService({
      engine: {
        streamPlanner: vi.fn() as never,
        streamRouter: async function* () {
          for (const event of events) {
            yield event;
          }
        } as never,
      },
    });

    const received: AgentStreamEvent[] = [];

    for await (const event of service.runMessageStream("user-1", "job-1", {
      threadId: "thread-1",
      message: "show tasks",
      timezone: "Europe/Warsaw",
    })) {
      received.push(event);
    }

    expect(received).toEqual(events);
  });

  it("streams plan-goal domain events through the engine", async () => {
    const events: AgentStreamEvent[] = [
      {
        type: "planner_started",
        jobId: "job-2",
        jobType: "plan_goal",
        threadId: "thread-1",
      },
      {
        type: "planner_waiting",
        jobId: "job-2",
        jobType: "plan_goal",
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
        jobId: "job-2",
        jobType: "plan_goal",
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
    const streamPlanner = vi.fn(async function* () {
      for (const event of events) {
        yield event;
      }
    });

    const service = new AgentService({
      engine: {
        streamPlanner: streamPlanner as never,
        streamRouter: vi.fn() as never,
      },
    });

    const received: AgentStreamEvent[] = [];

    for await (const event of service.continuePlanStream("user-1", "job-2", {
      threadId: "thread-1",
      message: "three days a week",
      questionAnswer: {
        field: "daysWeeklyFrequency",
        answer: "three days a week",
      },
      timezone: "Europe/Warsaw",
    })) {
      received.push(event);
    }

    expect(received).toEqual(events);
    expect(streamPlanner).toHaveBeenCalledWith({
      jobId: "job-2",
      jobType: "plan_goal",
      input: "three days a week",
      questionAnswer: {
        field: "daysWeeklyFrequency",
        answer: "three days a week",
      },
      requireCheckpoint: true,
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });
  });
});
