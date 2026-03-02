import type { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import type {
  AgentRefusal,
  PartialUserGoalPlanInput,
  PlannerAction,
  RoutedIntent,
  UserGoalPlanInput,
} from "../../agent.types.js";
import type { PlannedGoalWithTasks } from "../agent.schemas.js";
import { getOrInitCheckpointer } from "../checkpointer.js";
import type {
  PlannerWorkflow,
  PlannerWorkflowState,
} from "../planner-model/planner-workflow.js";
import { getOrInitPlannerWorkflow } from "../planner-model/planner-workflow.js";
import { createRouterModel } from "./router-model.js";
import {
  routerIntentSchema,
  routerPlanGoalExtractionSchema,
} from "./schemas.js";

const planGoalFieldLabels = {
  goal: "goal",
  dueDate: "due date",
  baseline: "baseline",
  startDate: "start date",
} as const;

type MissingPlanField = keyof typeof planGoalFieldLabels;

// TODO(AI Engine): Consolidate states of planner and router once extending their functionality
// Planner needs to ingest

const RouterState = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  input: Annotation<string>(),
  timezone: Annotation<string>(),
  userGoalPlanInput: Annotation<PartialUserGoalPlanInput | null>(),
  intent: Annotation<RoutedIntent | null>(),
  response: Annotation<string>(),
  plannerAction: Annotation<PlannerAction | null>(),
  plan: Annotation<PlannedGoalWithTasks | null>(),
  refusal: Annotation<AgentRefusal | null>(),
  missingPlanFields: Annotation<MissingPlanField[]>(),
  waitingForPlanInput: Annotation<boolean>(),
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
export type RouterWorkflowInput = Partial<RouterWorkflowState>;

export type RouterWorkflow = {
  invoke: (
    state: RouterWorkflowInput,
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

const buildPlanGoalInput = (
  userGoalPlanInput: UserGoalPlanInput | null,
  timezone: string,
): string | null => {
  if (!userGoalPlanInput) {
    return null;
  }

  const { goal, dueDate, baseline, startDate } = userGoalPlanInput;

  return [
    `Goal: ${goal}`,
    `Due date: ${dueDate}`,
    `Baseline: ${baseline}`,
    `Start date: ${startDate}`,
    `Timezone: ${timezone}`,
  ].join("\n");
};

const buildPlanExtractionPrompt = (input: string): string =>
  `
Extract any explicitly provided planning fields from the user's message.
Return structured output only.

Rules:
- Only extract a field when the user clearly provides it.
- Leave missing fields empty.
- Do not invent dates, timezones, or baseline details.

Fields:
- goal
- dueDate
- baseline
- startDate

User message:
${input}
`.trim();

const buildRouterPrompt = (state: RouterWorkflowState): string =>
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
${state.input}
`.trim();

const getMissingPlanFields = (
  userGoalPlanInput: PartialUserGoalPlanInput | null,
): MissingPlanField[] => {
  if (!userGoalPlanInput) {
    return ["goal", "dueDate", "baseline", "startDate"];
  }

  return (Object.keys(planGoalFieldLabels) as MissingPlanField[]).filter(
    (field) => !userGoalPlanInput[field]?.trim(),
  );
};

const isCompletePlanGoalInput = (
  userGoalPlanInput: PartialUserGoalPlanInput | null,
): userGoalPlanInput is UserGoalPlanInput => {
  if (!userGoalPlanInput) {
    return false;
  }

  return (
    Boolean(userGoalPlanInput.goal?.trim()) &&
    Boolean(userGoalPlanInput.dueDate?.trim()) &&
    Boolean(userGoalPlanInput.baseline?.trim()) &&
    Boolean(userGoalPlanInput.startDate?.trim())
  );
};

const buildClarificationResponse = (
  missingPlanFields: MissingPlanField[],
): string => {
  const labels = missingPlanFields.map((field) => planGoalFieldLabels[field]);

  return [
    "I can create a plan once I have a few more details.",
    `Please provide the ${labels.join(", ")}.`,
  ].join(" ");
};

const mergePlanGoalInput = (
  state: RouterWorkflowState,
  extractedInput: PartialUserGoalPlanInput | null,
): PartialUserGoalPlanInput | null => {
  const mergedInput = {
    ...(state.userGoalPlanInput ?? {}),
    ...(extractedInput ?? {}),
  } satisfies PartialUserGoalPlanInput;

  if (!Object.values(mergedInput).some(Boolean)) {
    return null;
  }

  return mergedInput;
};

const createPlannerInputState = (
  state: RouterWorkflowState,
): PlannerWorkflowState => ({
  threadId: state.threadId,
  userId: state.userId,
  input:
    buildPlanGoalInput(
      isCompletePlanGoalInput(state.userGoalPlanInput)
        ? state.userGoalPlanInput
        : null,
      state.timezone,
    ) ?? state.input,
  timezone: state.timezone,
  userGoalPlanInput: isCompletePlanGoalInput(state.userGoalPlanInput)
    ? state.userGoalPlanInput
    : null,
  intent: null,
  response: "",
  plannerAction: null,
  plan: null,
  refusal: null,
});

export const createRouterWorkflow = ({
  checkpointer,
  model,
  plannerWorkflow,
}: CreateRouterWorkflowDeps): RouterWorkflow => {
  const routerGraph = new StateGraph(RouterState)
    .addNode("entry", async () => ({}))
    .addNode("llmCallRouter", async (state: RouterWorkflowState) => {
      const llm = model.withStructuredOutput(routerIntentSchema, {
        name: "router_intent",
      });
      const output = await llm.invoke(buildRouterPrompt(state));

      return {
        intent: output.intent,
      };
    })
    .addNode("collect_plan_goal_input", async (state: RouterWorkflowState) => {
      if (
        !state.waitingForPlanInput &&
        isCompletePlanGoalInput(state.userGoalPlanInput)
      ) {
        return {
          userGoalPlanInput: state.userGoalPlanInput,
          missingPlanFields: [],
        };
      }

      // TODO(AI Engine): Work better around relative date wordings like "tomorrow", "next week", "end of the week"
      // TODO(AI Engine): Add in date helpers to work with the dates
      // TODO(AI Engine): separate parameter extraction into it's own file (GraphNode)
      // TODO(AI Engine): Introduce interruption to the flow instead of adding specialized nodes for parameter extraction
      const llm = model.withStructuredOutput(routerPlanGoalExtractionSchema, {
        name: "router_plan_goal_input",
      });
      const extractedInput = await llm.invoke(
        buildPlanExtractionPrompt(state.input),
      );
      const userGoalPlanInput = mergePlanGoalInput(state, {
        ...(extractedInput.goal ? { goal: extractedInput.goal } : {}),
        ...(extractedInput.dueDate ? { dueDate: extractedInput.dueDate } : {}),
        ...(extractedInput.baseline
          ? { baseline: extractedInput.baseline }
          : {}),
        ...(extractedInput.startDate
          ? { startDate: extractedInput.startDate }
          : {}),
      });

      return {
        userGoalPlanInput,
        missingPlanFields: getMissingPlanFields(userGoalPlanInput),
      };
    })
    .addNode("ask_for_plan_goal_input", async (state: RouterWorkflowState) => ({
      response: buildClarificationResponse(state.missingPlanFields),
      plannerAction: null,
      plan: null,
      refusal: null,
      waitingForPlanInput: true,
    }))
    .addNode("show_tasks", async () => ({
      response: "show_tasks",
      userGoalPlanInput: null,
      missingPlanFields: [],
      waitingForPlanInput: false,
      refusal: null,
    }))
    .addNode("show_goals", async () => ({
      response: "show_goals",
      userGoalPlanInput: null,
      missingPlanFields: [],
      waitingForPlanInput: false,
      refusal: null,
    }))
    .addNode("show_tasks_today", async () => ({
      response: "show_tasks_today",
      userGoalPlanInput: null,
      missingPlanFields: [],
      waitingForPlanInput: false,
      refusal: null,
    }))
    .addNode("refuse", async () => ({
      response: "refuse",
      userGoalPlanInput: null,
      missingPlanFields: [],
      waitingForPlanInput: false,
      refusal: null,
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
        refusal: plannerState.refusal,
        waitingForPlanInput: false,
        missingPlanFields: [],
      };
    })
    .addEdge(START, "entry")
    .addConditionalEdges("entry", (state: RouterWorkflowState) =>
      state.waitingForPlanInput ? "collect_plan_goal_input" : "llmCallRouter",
    )
    .addConditionalEdges("llmCallRouter", (state: RouterWorkflowState) => {
      switch (state.intent) {
        case "plan_goal":
          return "collect_plan_goal_input";
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
    .addConditionalEdges(
      "collect_plan_goal_input",
      (state: RouterWorkflowState) => {
        if (state.missingPlanFields.length > 0) {
          return "ask_for_plan_goal_input";
        }

        return "plan_goal";
      },
    )
    .addEdge("plan_goal", END)
    .addEdge("ask_for_plan_goal_input", END)
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
