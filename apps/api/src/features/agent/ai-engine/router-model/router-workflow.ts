import type { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import type { PlannerAction, RoutedIntent } from "../../agent.types.js";
import type { PlannedGoalWithTasks } from "../agent.schemas.js";
import { getOrInitCheckpointer } from "../checkpointer.js";
import type {
  PlannerWorkflow,
  PlannerWorkflowState,
} from "../planner-model/planner-workflow.js";
import { getOrInitPlannerWorkflow } from "../planner-model/planner-workflow.js";
import { createRouterModel } from "./router-model.js";
import { routerIntentSchema } from "./schemas.js";

const RouterState = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  input: Annotation<string>(),
  intent: Annotation<RoutedIntent | null>(),
  response: Annotation<string>(),
  plannerAction: Annotation<PlannerAction | null>(),
  plan: Annotation<PlannedGoalWithTasks | null>(),
});

type RouterRunnable<TSchema extends z.ZodTypeAny> = {
  invoke: (input: string) => Promise<z.infer<TSchema>>;
};

export type RouterModel = {
  withStructuredOutput: <TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    options: {
      name: string;
    },
  ) => RouterRunnable<TSchema>;
};

export type RouterWorkflowState = typeof RouterState.State;

export type RouterWorkflow = {
  invoke: (
    state: RouterWorkflowState,
    config?: {
      configurable?: {
        checkpoint_ns: string;
        thread_id: string;
      };
    },
  ) => Promise<RouterWorkflowState>;
};

let routerWorkflow: RouterWorkflow | null = null;
let initPromise: Promise<RouterWorkflow> | null = null;

type CreateRouterWorkflowDeps = {
  checkpointer?: RedisSaver;
  model: RouterModel;
  plannerWorkflow: PlannerWorkflow;
};

const buildRouterPrompt = (input: string): string =>
  `
You route Michi assistant requests.
Return structured output only.

Intent choices:
- plan_goal: user wants help creating a goal or roadmap
- show_tasks: user wants tasks
- show_goals: user wants goals
- show_tasks_today: user wants today's tasks
- refuse: request is outside scope

User request:
${input}
`.trim();

const createPlannerInputState = (
  state: RouterWorkflowState,
): PlannerWorkflowState => ({
  threadId: state.threadId,
  userId: state.userId,
  input: state.input,
  intent: null,
  response: "",
  plannerAction: null,
  plan: null,
});

export const createRouterWorkflow = ({
  checkpointer,
  model,
  plannerWorkflow,
}: CreateRouterWorkflowDeps): RouterWorkflow => {
  const routerGraph = new StateGraph(RouterState)
    .addNode("llmCallRouter", async (state: RouterWorkflowState) => {
      const llm = model.withStructuredOutput(routerIntentSchema, {
        name: "router_intent",
      });
      const output = await llm.invoke(buildRouterPrompt(state.input));

      return {
        intent: output.intent,
      };
    })
    .addNode("show_tasks", async () => ({
      response: "show_tasks",
    }))
    .addNode("show_goals", async () => ({
      response: "show_goals",
    }))
    .addNode("show_tasks_today", async () => ({
      response: "show_tasks_today",
    }))
    .addNode("refuse", async () => ({
      response: "refuse",
    }))
    .addNode("plan_goal", async (state: RouterWorkflowState) => {
      const plannerState = await plannerWorkflow.invoke(
        createPlannerInputState(state),
        {
          configurable: {
            thread_id: state.threadId,
            checkpoint_ns: state.userId,
          },
        },
      );

      return {
        response: plannerState.response,
        plannerAction: plannerState.plannerAction ?? "refuse_plan",
        plan: plannerState.plan,
      };
    })
    .addEdge(START, "llmCallRouter")
    .addConditionalEdges("llmCallRouter", (state: RouterWorkflowState) => {
      switch (state.intent) {
        case "plan_goal":
          return "plan_goal";
        case "show_tasks":
          return "show_tasks";
        case "show_goals":
          return "show_goals";
        case "show_tasks_today":
          return "show_tasks_today";
        default:
          return "refuse";
      }
    })
    .addEdge("plan_goal", END)
    .addEdge("show_tasks", END)
    .addEdge("show_goals", END)
    .addEdge("show_tasks_today", END)
    .addEdge("refuse", END);

  return routerGraph.compile({
    ...(checkpointer ? { checkpointer } : {}),
  }) as RouterWorkflow;
};

export const getOrInitRouterWorkflow = async (): Promise<RouterWorkflow> => {
  if (routerWorkflow) {
    return routerWorkflow;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const checkpointer = await getOrInitCheckpointer();
      const plannerWorkflow = await getOrInitPlannerWorkflow();
      const model = createRouterModel();

      routerWorkflow = createRouterWorkflow({
        checkpointer,
        model,
        plannerWorkflow,
      });

      return routerWorkflow;
    })().finally(() => {
      initPromise = null;
    });
  }

  return initPromise;
};
