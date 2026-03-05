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
        response: "How many days per week can you work on this?",
        plannerQuestions: [
          {
            stage: "intake",
            question: {
              field: "daysWeeklyFrequency",
              question: "How many days per week can you work on this?",
            },
            placeholder: "Example: 3 days per week",
            inputHint: "days_per_week",
          },
        ],
      }),
    ).toBe(true);

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
                'event: planner_waiting\ndata: {"type":"planner_waiting","jobId":"job-1","jobType":"message","threadId":"thread-1","stage":"intake","questions":[{"stage":"intake","question":{"field":"goal","question":"What exactly do you want to achieve?"},"placeholder":"Example: Run a 10k race","inputHint":"free_text"}]}\n\n',
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

    expect(onEvent).toHaveBeenCalledTimes(3);
    expect(onEvent).toHaveBeenNthCalledWith(1, {
      type: "router_started",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
    });
    expect(onEvent).toHaveBeenNthCalledWith(2, {
      type: "planner_waiting",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
      stage: "intake",
      questions: [
        {
          stage: "intake",
          question: {
            field: "goal",
            question: "What exactly do you want to achieve?",
          },
          placeholder: "Example: Run a 10k race",
          inputHint: "free_text",
        },
      ],
    });
    expect(onEvent).toHaveBeenNthCalledWith(3, {
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        threadId: "thread-1",
        jobId: "job-1",
      }),
      headers: new Headers({
        "content-type": "application/json",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      enqueueAgentRun({
        input: {
          threadId: "thread-1",
          message: "show tasks",
          questionAnswers: [
            {
              field: "goal",
              answer: "show tasks",
            },
          ],
          timezone: "Europe/Prague",
        },
        jobType: "message",
      }),
    ).resolves.toEqual({
      threadId: "thread-1",
      jobId: "job-1",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/bff/agent/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        threadId: "thread-1",
        message: "show tasks",
        questionAnswers: [
          {
            field: "goal",
            answer: "show tasks",
          },
        ],
        timezone: "Europe/Prague",
      }),
    });
  });
});
