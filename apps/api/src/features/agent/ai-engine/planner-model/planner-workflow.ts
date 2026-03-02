import type { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";
import type { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import type {
  AgentRefusal,
  PlannerAction,
  UserGoalPlanInput,
} from "../../agent.types.js";
import {
  plannedGoalWithTasksSchema,
  type PlannedGoalWithTasks,
} from "../agent.schemas.js";
import { getOrInitCheckpointer } from "../checkpointer.js";
import { getOrInitStore } from "../store.js";
import { createPlannerModel } from "./planner-model.js";
import {
  plannerModelOutputSchema,
  type PlannerModelOutput,
} from "./schemas.js";

const plannerRefusalResponse =
  "I couldn't create a plan from that request. Please try again with a clearer goal.";
const plannerRefusalProposal =
  "Provide a more realistic goal, timeline, or baseline.";

const PlannerState = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  input: Annotation<string>(),
  timezone: Annotation<string>(),
  userGoalPlanInput: Annotation<UserGoalPlanInput | null>(),
  intent: Annotation<PlannerAction | null>(),
  response: Annotation<string>(),
  plannerAction: Annotation<PlannerAction | null>(),
  plan: Annotation<PlannedGoalWithTasks | null>(),
  refusal: Annotation<AgentRefusal | null>(),
});

type PlannerRunnable<TSchema extends z.ZodTypeAny> = {
  invoke: (input: string) => Promise<z.infer<TSchema>>;
};

export type PlannerModel = {
  withStructuredOutput: <TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    options: {
      name: string;
    },
  ) => PlannerRunnable<TSchema>;
};

export type PlannerWorkflowState = typeof PlannerState.State;

export type PlannerWorkflow = {
  invoke: (
    state: PlannerWorkflowState,
    config?: {
      configurable?: {
        checkpoint_ns: string;
        thread_id: string;
      };
    },
  ) => Promise<PlannerWorkflowState>;
};

let plannerWorkflow: PlannerWorkflow | null = null;
let initPromise: Promise<PlannerWorkflow> | null = null;

type CreatePlannerWorkflowDeps = {
  checkpointer?: RedisSaver;
  model: PlannerModel;
  store?: PostgresStore;
};

const buildPlannerInput = (
  userGoalPlanInput: UserGoalPlanInput | null,
  timezone: string,
): string =>
  userGoalPlanInput
    ? [
        `Goal: ${userGoalPlanInput.goal}`,
        `Baseline: ${userGoalPlanInput.baseline}`,
        `Start date: ${userGoalPlanInput.startDate}`,
        `Due date: ${userGoalPlanInput.dueDate}`,
        `Timezone: ${timezone}`,
      ].join("\n")
    : "";

// TODO(AI Engine): Improve prompt
// TODO(AI Engine): Make goals and baselines quantifiable
// TODO(AI Engine): Improve quantifiable goal and baseline descriptions (e. g. ask user for clarification)
// TODO(AI Engine): Separate quantifying of parameters into it's own file (Graph node)
const buildPlannerPrompt = (state: PlannerWorkflowState): string =>
  `
You are a supportive planning coach for Michi.
Help the user turn their request into one goal and a practical roadmap of tasks.
Return structured output only.

Rules:
- Focus on concrete, actionable planning.
- Distribute work between the provided start date and due date.
- Respect the user's baseline when deciding scope and sequencing.
- Use dueAt when you can anchor work to a specific day in the schedule.
- Refuse unrealistic plans instead of overcommitting.
- If refused, don't even create the plan, don't create the goal and tasks.
- If plan is accepted create exactly one goal with it's tasks as a scheduled array.
- Titles must include a measurable action (distance/minutes).
- No “later”, “increase gradually”, “build a schedule”, “work on endurance”.
- Each schedule item must anchor to a specific calendar date.
- All workouts default to 09:00 local time unless user provided time

User request:
${state.userGoalPlanInput ? buildPlannerInput(state.userGoalPlanInput, state.timezone) : state.input}
`.trim();

const toPlanResponse = (plan: PlannedGoalWithTasks): string =>
  `Created a plan for "${plan.goal.title}" with ${plan.tasks.length} task${plan.tasks.length === 1 ? "" : "s"}.`;

const normalizePlan = (
  output: Extract<PlannerModelOutput, { intent: "create_plan" }>,
): PlannedGoalWithTasks =>
  plannedGoalWithTasksSchema.parse({
    goal: output.goal,
    tasks: output.tasks.slice(0, 10),
  });

const createFallbackRefusal = (): AgentRefusal => ({
  reason: plannerRefusalResponse,
  proposals: [plannerRefusalProposal],
});

const normalizeRefusal = (output: unknown): AgentRefusal => {
  if (
    output &&
    typeof output === "object" &&
    "reason" in output &&
    "proposals" in output &&
    typeof output.reason === "string" &&
    output.reason.trim() &&
    Array.isArray(output.proposals)
  ) {
    const proposals = output.proposals.filter(
      (proposal): proposal is string =>
        typeof proposal === "string" && proposal.trim().length > 0,
    );

    if (proposals.length > 0) {
      return {
        reason: output.reason.trim(),
        proposals,
      };
    }
  }

  return createFallbackRefusal();
};

export const createPlannerWorkflow = ({
  checkpointer,
  model,
  store,
}: CreatePlannerWorkflowDeps): PlannerWorkflow => {
  const plannerGraph = new StateGraph(PlannerState)
    .addNode("llmCallPlanner", async (state: PlannerWorkflowState) => {
      const llm = model.withStructuredOutput(plannerModelOutputSchema, {
        name: "planner_output",
      });
      const output = await llm.invoke(buildPlannerPrompt(state));

      if (output.intent === "refuse_plan") {
        const refusal = normalizeRefusal(output);

        return {
          intent: "refuse_plan" as PlannerAction,
          response: refusal.reason,
          refusal,
        };
      }

      try {
        const plan = normalizePlan(output);

        return {
          intent: "create_plan" as PlannerAction,
          plan,
        };
      } catch {
        const refusal = createFallbackRefusal();

        return {
          intent: "refuse_plan" as PlannerAction,
          response: refusal.reason,
          refusal,
        };
      }
    })
    .addNode("create_plan", async (state: PlannerWorkflowState) => ({
      plannerAction: "create_plan" as PlannerAction,
      response: state.plan
        ? toPlanResponse(state.plan)
        : plannerRefusalResponse,
      refusal: null,
    }))
    .addNode("refuse_plan", async (state: PlannerWorkflowState) => {
      const refusal = state.refusal ?? createFallbackRefusal();

      return {
        plannerAction: "refuse_plan" as PlannerAction,
        response: state.response || refusal.reason,
        refusal,
      };
    })
    .addEdge(START, "llmCallPlanner")
    .addConditionalEdges("llmCallPlanner", (state: PlannerWorkflowState) =>
      state.intent === "create_plan" ? "create_plan" : "refuse_plan",
    )
    .addEdge("create_plan", END)
    .addEdge("refuse_plan", END);

  return plannerGraph.compile({
    ...(checkpointer ? { checkpointer } : {}),
    ...(store ? { store } : {}),
  }) as PlannerWorkflow;
};

export const getOrInitPlannerWorkflow = async (): Promise<PlannerWorkflow> => {
  if (plannerWorkflow) {
    return plannerWorkflow;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const checkpointer = await getOrInitCheckpointer();
      const store = await getOrInitStore();
      const model = createPlannerModel();

      plannerWorkflow = createPlannerWorkflow({
        checkpointer,
        model,
        store,
      });

      return plannerWorkflow;
    })().finally(() => {
      initPromise = null;
    });
  }

  return initPromise;
};
