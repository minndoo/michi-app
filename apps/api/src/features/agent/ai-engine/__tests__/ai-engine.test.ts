import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiEngine, AiEngineUnavailableError } from "../ai-engine.js";
import type {
  PlannerWorkflow,
  PlannerWorkflowState,
} from "../workflows/planner-workflow/planner-workflow.js";
import type { RouterWorkflow } from "../workflows/router-workflow/router-workflow.js";

const createPlannerState = (
  overrides: Partial<PlannerWorkflowState> = {},
): PlannerWorkflowState => ({
  threadId: "thread-1",
  userId: "user-1",
  referenceDate: "2026-03-02T00:00:00.000Z",
  input: "Plan my fitness goal",
  timezone: "Europe/Warsaw",
  routedIntent: "plan_goal",
  planningStage: "generation",
  response: "",
  plannerAction: null,
  plannerQuestion: null,
  plan: null,
  refusal: null,
  intakeAccepted: null,
  preparationAccepted: null,
  ...overrides,
});

const createPlannerWorkflowDouble = (
  overrides: Partial<PlannerWorkflow> = {},
): PlannerWorkflow =>
  ({
    getState: vi.fn().mockResolvedValue({
      createdAt: "2026-03-02T00:00:00.000Z",
      values: {},
    }),
    invoke: vi.fn().mockResolvedValue(createPlannerState()),
    stream: vi.fn().mockResolvedValue((async function* () {})()),
    ...overrides,
  }) as never;

const createStream = (...chunks: unknown[]): AsyncIterable<unknown> =>
  (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();

describe("AiEngine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("streams router domain events for non-plan intents", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        createStream({
          llmCallRouter: {
            intent: "show_tasks",
          },
        }),
      ),
    };

    const engine = new AiEngine({
      routerWorkflow: mockedRouterWorkflow,
      plannerWorkflow: createPlannerWorkflowDouble(),
    });

    const events = [];

    for await (const event of engine.streamRouter({
      jobId: "job-1",
      jobType: "message",
      input: "show tasks",
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    })) {
      events.push(event);
    }

    expect(events).toEqual([
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
          response: "show_tasks",
        },
      },
    ]);
  });

  it("streams planner stage domain events for plan_goal", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        createStream({
          llmCallRouter: {
            intent: "plan_goal",
          },
        }),
      ),
    };
    const mockedPlannerWorkflow = createPlannerWorkflowDouble({
      stream: vi.fn().mockResolvedValue(
        createStream(
          {
            run_intake: {
              planningStage: "intake",
              response: "Need more info.",
              plannerQuestion: {
                stage: "intake",
                question: {
                  field: "daysWeeklyFrequency",
                  question: "How many days per week can you work on this?",
                },
                placeholder: "Example: 3 days per week",
                inputHint: "days_per_week",
              },
              plannerAction: null,
              plan: null,
              refusal: null,
            },
          },
          {
            run_preparation: {
              planningStage: "preparation",
              response: "Still working.",
              plannerQuestion: null,
            },
          },
          {
            run_generation: {
              response: "Created a plan with 3 tasks.",
              plannerAction: "create_plan",
              plannerQuestion: null,
              plan: {
                goal: { title: "Run 10k" },
                tasks: [{ title: "Run 3 times a week" }],
              },
            },
          },
        ),
      ),
    });

    const engine = new AiEngine({
      routerWorkflow: mockedRouterWorkflow,
      plannerWorkflow: mockedPlannerWorkflow,
    });

    const events = [];

    for await (const event of engine.streamRouter({
      jobId: "job-1",
      jobType: "message",
      input: "plan my goal",
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    })) {
      events.push(event);
    }

    expect(events).toContainEqual({
      type: "planner_stage",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
      stage: "intake",
      payload: {
        planningStage: "intake",
        response: "Need more info.",
        plannerQuestion: {
          stage: "intake",
          question: {
            field: "daysWeeklyFrequency",
            question: "How many days per week can you work on this?",
          },
          placeholder: "Example: 3 days per week",
          inputHint: "days_per_week",
        },
        plannerAction: null,
        plan: null,
        refusal: null,
      },
    });
    expect(events).toContainEqual({
      type: "planner_stage",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
      stage: "preparation",
      payload: {
        planningStage: "preparation",
        response: "Still working.",
        plannerQuestion: null,
      },
    });
    expect(events).toContainEqual({
      type: "planner_stage",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
      stage: "generation",
      payload: {
        response: "Created a plan with 3 tasks.",
        plannerAction: "create_plan",
        plannerQuestion: null,
        plan: {
          goal: { title: "Run 10k" },
          tasks: [{ title: "Run 3 times a week" }],
        },
      },
    });
    expect(events.at(-2)).toEqual({
      type: "planner_completed",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
      plannerAction: "create_plan",
    });
    expect(events.at(-1)).toEqual({
      type: "result",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
      response: {
        threadId: "thread-1",
        routedIntent: "plan_goal",
        response: "Created a plan with 3 tasks.",
        plannerAction: "create_plan",
        plan: {
          goal: { title: "Run 10k" },
          tasks: [{ title: "Run 3 times a week" }],
        },
      },
    });
  });

  it("streams planner waiting results", async () => {
    const mockedPlannerWorkflow = createPlannerWorkflowDouble({
      stream: vi.fn().mockResolvedValue(
        createStream({
          run_intake: {
            planningStage: "intake",
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
            plannerAction: null,
            plan: null,
            refusal: null,
          },
        }),
      ),
    });

    const engine = new AiEngine({
      plannerWorkflow: mockedPlannerWorkflow,
      routerWorkflow: {
        invoke: vi.fn(),
        stream: vi.fn().mockResolvedValue(createStream()),
      } as never,
    });

    const events = [];

    for await (const event of engine.streamPlanner({
      jobId: "job-2",
      jobType: "plan_goal",
      input: "three days a week",
      questionAnswer: {
        field: "daysWeeklyFrequency",
        answer: "three days a week",
      },
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    })) {
      events.push(event);
    }

    expect(events.at(-2)).toEqual({
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
    });
    expect(events.at(-1)).toEqual({
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
    });
    expect(mockedPlannerWorkflow.stream).toHaveBeenCalledWith(
      expect.objectContaining({
        questionAnswer: {
          field: "daysWeeklyFrequency",
          answer: "three days a week",
        },
      }),
      expect.any(Object),
    );
  });

  it("treats legacy plan_goal waiting results as waiting without completion", async () => {
    const mockedPlannerWorkflow = createPlannerWorkflowDouble({
      stream: vi.fn().mockResolvedValue(
        createStream({
          run_intake: {
            planningStage: "intake",
            response: "Need more info.",
            plannerAction: null,
            plan: null,
            refusal: null,
          },
        }),
      ),
    });

    const engine = new AiEngine({
      plannerWorkflow: mockedPlannerWorkflow,
      routerWorkflow: {
        invoke: vi.fn(),
        stream: vi.fn().mockResolvedValue(createStream()),
      } as never,
    });

    const events = [];

    for await (const event of engine.streamPlanner({
      jobId: "job-2",
      jobType: "plan_goal",
      input: "three days a week",
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        type: "planner_started",
        jobId: "job-2",
        jobType: "plan_goal",
        threadId: "thread-1",
      },
      {
        type: "planner_stage",
        jobId: "job-2",
        jobType: "plan_goal",
        threadId: "thread-1",
        stage: "intake",
        payload: {
          planningStage: "intake",
          response: "Need more info.",
          plannerAction: null,
          plan: null,
          refusal: null,
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
          response: "Need more info.",
        },
      },
    ]);
  });

  it("streams missing-checkpoint refusals through planner stream", async () => {
    const mockedPlannerWorkflow = createPlannerWorkflowDouble({
      getState: vi.fn().mockResolvedValue({
        values: {},
      }),
      stream: vi.fn().mockResolvedValue(createStream()),
    });

    const engine = new AiEngine({
      plannerWorkflow: mockedPlannerWorkflow,
      routerWorkflow: {
        invoke: vi.fn(),
        stream: vi.fn().mockResolvedValue(createStream()),
      } as never,
    });

    const events = [];

    for await (const event of engine.streamPlanner({
      jobId: "job-2",
      jobType: "plan_goal",
      input: "three days a week",
      requireCheckpoint: true,
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        type: "planner_started",
        jobId: "job-2",
        jobType: "plan_goal",
        threadId: "thread-1",
      },
      {
        type: "planner_completed",
        jobId: "job-2",
        jobType: "plan_goal",
        threadId: "thread-1",
        plannerAction: "refuse_plan",
      },
      {
        type: "result",
        jobId: "job-2",
        jobType: "plan_goal",
        threadId: "thread-1",
        response: {
          threadId: "thread-1",
          routedIntent: "plan_goal",
          plannerAction: "refuse_plan",
          response: "No saved planning session exists for this thread.",
          refusal: {
            reason: "No saved planning session exists for this thread.",
            proposals: [
              "Start a new planning request from /message.",
              "Continue with a thread that already has planner state.",
            ],
          },
        },
      },
    ]);
    expect(mockedPlannerWorkflow.stream).not.toHaveBeenCalled();
  });

  it("wraps router initialization failures", async () => {
    const error = new Error("redis offline");
    const mockedConsoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const engine = new AiEngine({
      factories: {
        getOrInitRouterWorkflow: vi.fn().mockRejectedValue(error),
        getOrInitPlannerWorkflow: vi.fn(),
      },
    });

    await expect(
      Array.fromAsync(
        engine.streamRouter({
          jobId: "job-1",
          jobType: "message",
          input: "show tasks",
          threadId: "thread-1",
          userId: "user-1",
          timezone: "Europe/Warsaw",
        }),
      ),
    ).rejects.toBeInstanceOf(AiEngineUnavailableError);
    expect(mockedConsoleErrorSpy).toHaveBeenCalledWith(
      "AI engine router initialization failed",
      expect.objectContaining({
        error: "redis offline",
        threadId: "thread-1",
        userId: "user-1",
      }),
    );
  });
});
