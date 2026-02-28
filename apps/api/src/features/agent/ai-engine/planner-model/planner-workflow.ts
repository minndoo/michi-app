import type { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";
import type { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import type { PlannerAction } from "../../agent.types.js";
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

const PlannerState = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  input: Annotation<string>(),
  intent: Annotation<PlannerAction | null>(),
  response: Annotation<string>(),
  plannerAction: Annotation<PlannerAction | null>(),
  plan: Annotation<PlannedGoalWithTasks | null>(),
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

const buildPlannerPrompt = (input: string): string =>
  `
You are a supportive planning coach for Michi.
Help the user turn their request into one goal and a practical roadmap of tasks.
Return structured output only.

Rules:
- Create exactly one goal.
- Create between 1 and 10 tasks.
- Focus on concrete, actionable planning.
- Do not add guardrails beyond the refusal branch.
- Use dueAt only if the user clearly provides time information.

User request:
${input}
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
      const output = await llm.invoke(buildPlannerPrompt(state.input));

      if (output.intent === "refuse_plan") {
        return {
          intent: "refuse_plan" as PlannerAction,
          response: output.reason ?? plannerRefusalResponse,
        };
      }

      try {
        const plan = normalizePlan(output);

        return {
          intent: "create_plan" as PlannerAction,
          plan,
        };
      } catch {
        return {
          intent: "refuse_plan" as PlannerAction,
          response: plannerRefusalResponse,
        };
      }
    })
    .addNode("create_plan", async (state: PlannerWorkflowState) => ({
      plannerAction: "create_plan" as PlannerAction,
      response: state.plan
        ? toPlanResponse(state.plan)
        : plannerRefusalResponse,
    }))
    .addNode("refuse_plan", async (state: PlannerWorkflowState) => ({
      plannerAction: "refuse_plan" as PlannerAction,
      response: state.response || plannerRefusalResponse,
    }))
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
