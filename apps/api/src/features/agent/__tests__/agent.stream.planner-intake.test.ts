import { describe, expect, it, vi } from "vitest";
import { AiEngine } from "../ai-engine/ai-engine.js";
import type {
  PlannerWorkflow,
  PlannerWorkflowState,
} from "../ai-engine/workflows/planner-workflow/planner-workflow.js";

const intakeQuestionByField = {
  goal: {
    stage: "intake" as const,
    question: {
      field: "goal" as const,
      question: "What exactly do you want to achieve?",
    },
    placeholder: "Example: Run a 10k race",
    inputHint: "free_text" as const,
  },
  baseline: {
    stage: "intake" as const,
    question: {
      field: "baseline" as const,
      question: "What is your current starting point?",
    },
    placeholder: "Example: I can currently run 3 km without stopping",
    inputHint: "free_text" as const,
  },
  startDate: {
    stage: "intake" as const,
    question: {
      field: "startDate" as const,
      question:
        'When do you want to start? You can answer with a date or something like "tomorrow".',
    },
    placeholder: "Example: tomorrow",
    inputHint: "date_or_relative" as const,
  },
  dueDate: {
    stage: "intake" as const,
    question: {
      field: "dueDate" as const,
      question:
        'When should this be completed? You can answer with a date or something like "in 6 weeks".',
    },
    placeholder: "Example: in 6 weeks",
    inputHint: "date_or_relative" as const,
  },
  daysWeeklyFrequency: {
    stage: "intake" as const,
    question: {
      field: "daysWeeklyFrequency" as const,
      question: "How many days per week can you work on this?",
    },
    placeholder: "Example: 3 days per week",
    inputHint: "days_per_week" as const,
  },
};

const createPlannerState = (
  overrides: Partial<PlannerWorkflowState> = {},
): PlannerWorkflowState => ({
  threadId: "thread-1",
  userId: "user-1",
  referenceDate: "2026-03-02T00:00:00.000Z",
  input: "Plan my goal",
  timezone: "Europe/Warsaw",
  routedIntent: "plan_goal",
  planningStage: "intake",
  intakeAccepted: null,
  preparationAccepted: null,
  plannerQuestions: null,
  response: "",
  plannerAction: null,
  plan: null,
  refusal: null,
  ...overrides,
});

const createPlannerWorkflowDouble = (chunks: unknown[]): PlannerWorkflow =>
  ({
    getState: vi.fn().mockResolvedValue({
      createdAt: "2026-03-02T00:00:00.000Z",
      values: {},
    }),
    invoke: vi.fn().mockResolvedValue(createPlannerState()),
    stream: vi.fn().mockResolvedValue(
      (async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })(),
    ),
  }) as never;

describe("agent stream planner intake contracts", () => {
  it("keeps successful planner completions free of planner questions", async () => {
    const engine = new AiEngine({
      plannerWorkflow: createPlannerWorkflowDouble([
        {
          run_intake: {
            planningStage: "preparation",
            intakeAccepted: {
              goal: "Run a 10k",
              baseline: "Can run 3km",
              startDate: "tomorrow",
              dueDate: "in a month",
              daysWeeklyFrequency: 3,
            },
            plannerQuestions: null,
          },
        },
        {
          run_preparation: {
            planningStage: "generation",
            plannerQuestions: null,
          },
        },
        {
          run_generation: {
            response: "Created a plan with 2 tasks.",
            plannerAction: "create_plan",
            plannerQuestions: null,
            plan: {
              goal: { title: "Run a 10k" },
              tasks: [{ title: "Run three times this week" }],
            },
          },
        },
      ]),
      routerWorkflow: {
        invoke: vi.fn(),
        stream: vi.fn(),
      } as never,
    });

    const events = await Array.fromAsync(
      engine.streamPlanner({
        jobId: "job-1",
        jobType: "plan_goal",
        input: "Plan my goal",
        threadId: "thread-1",
        userId: "user-1",
        timezone: "Europe/Warsaw",
      }),
    );

    expect(
      events.find((event) => event.type === "planner_waiting"),
    ).toBeFalsy();
    expect(events.at(-1)).toEqual({
      type: "result",
      jobId: "job-1",
      jobType: "plan_goal",
      threadId: "thread-1",
      response: {
        threadId: "thread-1",
        routedIntent: "plan_goal",
        response: "Created a plan with 2 tasks.",
        plannerAction: "create_plan",
        plan: {
          goal: { title: "Run a 10k" },
          tasks: [{ title: "Run three times this week" }],
        },
      },
    });
  });

  it.each(Object.entries(intakeQuestionByField))(
    "translates missing %s into the unified intake question contract",
    async (_field, question) => {
      const engine = new AiEngine({
        plannerWorkflow: createPlannerWorkflowDouble([
          {
            run_intake: {
              planningStage: "intake",
              response: question.question.question,
              plannerQuestions: [question],
              plannerAction: null,
              plan: null,
              refusal: null,
            },
          },
        ]),
        routerWorkflow: {
          invoke: vi.fn(),
          stream: vi.fn(),
        } as never,
      });

      const events = await Array.fromAsync(
        engine.streamPlanner({
          jobId: "job-2",
          jobType: "plan_goal",
          input: "follow up",
          threadId: "thread-1",
          userId: "user-1",
          timezone: "Europe/Warsaw",
        }),
      );

      expect(events.at(-2)).toEqual({
        type: "planner_waiting",
        jobId: "job-2",
        jobType: "plan_goal",
        threadId: "thread-1",
        stage: "intake",
        questions: [question],
      });
      expect(events.at(-1)).toEqual({
        type: "result",
        jobId: "job-2",
        jobType: "plan_goal",
        threadId: "thread-1",
        response: {
          threadId: "thread-1",
          routedIntent: "plan_goal",
          response: question.question.question,
          plannerQuestions: [question],
        },
      });
    },
  );

  it("uses the same question contract for preparation clarifications", async () => {
    const question = {
      stage: "preparation" as const,
      question: {
        field: "daysWeeklyFrequency" as const,
        question: "Which days of the week can you train?",
      },
      placeholder: "Example: Monday, Wednesday, Friday",
      inputHint: "free_text" as const,
    };
    const engine = new AiEngine({
      plannerWorkflow: createPlannerWorkflowDouble([
        {
          run_preparation: {
            planningStage: "preparation",
            response: question.question.question,
            plannerQuestions: [question],
            plannerAction: null,
            plan: null,
            refusal: null,
          },
        },
      ]),
      routerWorkflow: {
        invoke: vi.fn(),
        stream: vi.fn(),
      } as never,
    });

    const events = await Array.fromAsync(
      engine.streamPlanner({
        jobId: "job-3",
        jobType: "plan_goal",
        input: "follow up",
        threadId: "thread-1",
        userId: "user-1",
        timezone: "Europe/Warsaw",
      }),
    );

    expect(events.at(-2)).toEqual({
      type: "planner_waiting",
      jobId: "job-3",
      jobType: "plan_goal",
      threadId: "thread-1",
      stage: "preparation",
      questions: [question],
    });
    expect(events.at(-1)).toEqual({
      type: "result",
      jobId: "job-3",
      jobType: "plan_goal",
      threadId: "thread-1",
      response: {
        threadId: "thread-1",
        routedIntent: "plan_goal",
        response: question.question.question,
        plannerQuestions: [question],
      },
    });
  });
});
