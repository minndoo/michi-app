import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { RoutedIntent } from "../../../agent.types.js";
import type { PlanningSharedState } from "../../../agent.types.js";
import type { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { createFastModel } from "../../models/fast-model.js";
import { getOrInitCheckpointer } from "../../persistence/checkpointer.js";
import { routerIntentSchema } from "./schemas.js";

type RouterState = PlanningSharedState & {
  input: string;
  intent: RoutedIntent | null;
};

export type RouterWorkflowInput = RouterState;
export type RouterWorkflowState = RouterState;
export type RouterWorkflow = {
  invoke: (
    state: RouterWorkflowState,
    config?: RunnableConfig,
  ) => Promise<RouterWorkflowState>;
};

type CreateRouterWorkflowDeps = {
  checkpointer?: RedisSaver;
  model: BaseChatModel;
};

const RouterStateAnnotation = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  referenceDate: Annotation<string>(),
  timezone: Annotation<string>(),
  input: Annotation<string>(),
  intent: Annotation<RoutedIntent | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
});

const buildRouterPrompt = (state: RouterWorkflowState): string => `
You are an intent classifier for a personal planning application.

Reference date: ${state.referenceDate}
Timezone: ${state.timezone}

Choose exactly one intent:
- plan_goal
- show_tasks
- show_goals
- show_tasks_today
- refuse

User input:
${state.input}
`;

const llmCallRouter = async (
  state: RouterWorkflowState,
  model: BaseChatModel,
): Promise<Partial<RouterWorkflowState>> => {
  const structuredModel = model.withStructuredOutput(routerIntentSchema);
  const response = await structuredModel.invoke(buildRouterPrompt(state));

  return {
    intent: response.intent,
  };
};

export const createRouterWorkflow = ({
  checkpointer,
  model,
}: CreateRouterWorkflowDeps): RouterWorkflow => {
  const workflow = new StateGraph(RouterStateAnnotation)
    .addNode("llmCallRouter", (state) => llmCallRouter(state, model))
    .addEdge(START, "llmCallRouter")
    .addEdge("llmCallRouter", END);

  return workflow.compile({
    ...(checkpointer ? { checkpointer } : {}),
  }) as RouterWorkflow;
};

let workflowPromise: Promise<RouterWorkflow> | null = null;
let workflow: RouterWorkflow | null = null;

export const getOrInitRouterWorkflow = async (): Promise<RouterWorkflow> => {
  if (workflow) {
    return workflow;
  }

  if (!workflowPromise) {
    workflowPromise = (async () => {
      const [model, checkpointer] = await Promise.all([
        createFastModel(),
        getOrInitCheckpointer(),
      ]);

      workflow = createRouterWorkflow({
        checkpointer,
        model,
      });

      return workflow;
    })().finally(() => {
      workflowPromise = null;
    });
  }

  return workflowPromise;
};
