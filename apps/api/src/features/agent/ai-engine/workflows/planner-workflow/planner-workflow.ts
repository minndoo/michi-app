import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";
import type { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import type {
  AgentPlannedGoalWithTasks,
  AgentRefusal,
  PlannerAction,
  PlanIntakeAccepted,
  PlanPreparationAccepted,
  PlanningSharedState,
  PlanningStage,
  RoutedIntent,
} from "../../../agent.types.js";
import { createFastModel } from "../../models/fast-model.js";
import { createReasoningModel } from "../../models/reasoning-model.js";
import { getOrInitCheckpointer } from "../../persistence/checkpointer.js";
import { getOrInitStore } from "../../persistence/store.js";
import {
  createPlannerGenerationWorkflow,
  type PlannerGenerationWorkflow,
} from "./planner-generation-workflow/planner-generation-workflow.js";
import {
  createPlannerIntakeWorkflow,
  type PlannerIntakeWorkflow,
} from "./planner-intake-workflow/planner-intake-workflow.js";
import {
  createPlannerPreparationWorkflow,
  type PlannerPreparationWorkflow,
} from "./planner-preparation-workflow/planner-preparation-workflow.js";

type PlannerWorkflowDeps = {
  intakeWorkflow: PlannerIntakeWorkflow;
  preparationWorkflow: PlannerPreparationWorkflow;
  generationWorkflow: PlannerGenerationWorkflow;
};

type PlannerState = PlanningSharedState & {
  input: string;
  routedIntent: RoutedIntent;
  planningStage: PlanningStage;
  intakeAccepted: PlanIntakeAccepted | null;
  preparationAccepted: PlanPreparationAccepted | null;
  response: string;
  plannerAction: PlannerAction | null;
  plan: AgentPlannedGoalWithTasks | null;
  refusal: AgentRefusal | null;
};

export type PlannerWorkflowInput = PlanningSharedState & {
  input: string;
  routedIntent: RoutedIntent;
  planningStage?: PlanningStage;
  intakeAccepted?: PlanIntakeAccepted | null;
  preparationAccepted?: PlanPreparationAccepted | null;
  response?: string;
  plannerAction?: PlannerAction | null;
  plan?: AgentPlannedGoalWithTasks | null;
  refusal?: AgentRefusal | null;
};
export type PlannerWorkflowState = PlannerState;
export type PlannerWorkflow = {
  invoke: (
    state: PlannerWorkflowInput,
    config?: {
      configurable?: {
        checkpoint_ns: string;
        thread_id: string;
      };
    },
  ) => Promise<PlannerWorkflowState>;
  getState: (config: {
    configurable?: {
      checkpoint_ns: string;
      thread_id: string;
    };
  }) => Promise<{
    createdAt?: string;
    metadata?: object;
    values: unknown;
  }>;
};

type CreatePlannerWorkflowOptions = PlannerWorkflowDeps & {
  checkpointer?: RedisSaver;
  store?: PostgresStore;
};

const PlannerStateAnnotation = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  referenceDate: Annotation<string>(),
  timezone: Annotation<string>(),
  input: Annotation<string>(),
  routedIntent: Annotation<RoutedIntent>({
    reducer: (_, update) => update,
  }),
  planningStage: Annotation<PlanningStage>({
    reducer: (_, update) => update ?? "intake",
    default: () => "intake",
  }),
  intakeAccepted: Annotation<PlanIntakeAccepted | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  preparationAccepted: Annotation<PlanPreparationAccepted | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  response: Annotation<string>({
    reducer: (_, update) => update ?? "",
    default: () => "",
  }),
  plannerAction: Annotation<PlannerAction | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  plan: Annotation<AgentPlannedGoalWithTasks | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  refusal: Annotation<AgentRefusal | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
});

const buildIntakeResponse = (missingFields: string[]): string =>
  `I can continue once you provide: ${missingFields.join(", ")}.`;

const buildPreparationResponse = (clarifyingQuestions: string[]): string =>
  clarifyingQuestions.join(" ");

const buildPlanResponse = (plan: AgentPlannedGoalWithTasks): string =>
  `Created a plan with ${plan.tasks.length} tasks.`;

const buildRefusalResponse = (refusal: AgentRefusal): string => refusal.reason;

const runIntake = async (
  state: PlannerWorkflowState,
  intakeWorkflow: PlannerIntakeWorkflow,
): Promise<Partial<PlannerWorkflowState>> => {
  const result = await intakeWorkflow.invoke({
    threadId: state.threadId,
    userId: state.userId,
    referenceDate: state.referenceDate,
    timezone: state.timezone,
    input: state.input,
    accepted: state.intakeAccepted,
    denied: null,
  });

  if (result.denied) {
    return {
      planningStage: "intake",
      response: buildIntakeResponse(result.denied.missingFields),
      plannerAction: null,
      plan: null,
      refusal: null,
    };
  }

  return {
    intakeAccepted: result.accepted,
    planningStage: "preparation",
  };
};

const runPreparation = async (
  state: PlannerWorkflowState,
  preparationWorkflow: PlannerPreparationWorkflow,
): Promise<Partial<PlannerWorkflowState>> => {
  const result = await preparationWorkflow.invoke({
    threadId: state.threadId,
    userId: state.userId,
    referenceDate: state.referenceDate,
    timezone: state.timezone,
    input: state.input,
    intakeAccepted: state.intakeAccepted!,
    accepted: state.preparationAccepted,
    waiting: null,
  });

  if (result.waiting) {
    return {
      planningStage: "preparation",
      response: buildPreparationResponse(result.waiting.clarifyingQuestions),
      plannerAction: null,
      plan: null,
      refusal: null,
    };
  }

  return {
    preparationAccepted: result.accepted,
    planningStage: "generation",
  };
};

const runGeneration = async (
  state: PlannerWorkflowState,
  generationWorkflow: PlannerGenerationWorkflow,
): Promise<Partial<PlannerWorkflowState>> => {
  const result = await generationWorkflow.invoke({
    threadId: state.threadId,
    userId: state.userId,
    referenceDate: state.referenceDate,
    timezone: state.timezone,
    input: state.input,
    preparationAccepted: state.preparationAccepted!,
    plannerAction: state.plannerAction,
    plan: state.plan,
    refusal: state.refusal,
  });

  if (result.plannerAction === "refuse_plan" && result.refusal) {
    return {
      plannerAction: "refuse_plan",
      response: buildRefusalResponse(result.refusal),
      plan: null,
      refusal: result.refusal,
    };
  }

  return {
    plannerAction: "create_plan",
    response: buildPlanResponse(result.plan!),
    plan: result.plan,
    refusal: null,
  };
};

export const createPlannerWorkflow = ({
  checkpointer,
  intakeWorkflow,
  preparationWorkflow,
  generationWorkflow,
  store,
}: CreatePlannerWorkflowOptions): PlannerWorkflow => {
  const workflow = new StateGraph(PlannerStateAnnotation)
    .addNode("run_intake", (state) => runIntake(state, intakeWorkflow))
    .addNode("run_preparation", (state) =>
      runPreparation(state, preparationWorkflow),
    )
    .addNode("run_generation", (state) =>
      runGeneration(state, generationWorkflow),
    )
    .addNode("return_waiting", (state) => state)
    .addNode("return_plan", (state) => state)
    .addNode("return_refusal", (state) => state)
    .addConditionalEdges(START, (state) => {
      if (state.planningStage === "preparation") {
        return "run_preparation";
      }

      if (state.planningStage === "generation") {
        return "run_generation";
      }

      return "run_intake";
    })
    .addConditionalEdges("run_intake", (state) => {
      if (state.planningStage === "intake") {
        return "return_waiting";
      }

      return "run_preparation";
    })
    .addConditionalEdges("run_preparation", (state) => {
      if (state.planningStage === "preparation") {
        return "return_waiting";
      }

      return "run_generation";
    })
    .addConditionalEdges("run_generation", (state) =>
      state.plannerAction === "refuse_plan" ? "return_refusal" : "return_plan",
    )
    .addEdge("return_waiting", END)
    .addEdge("return_plan", END)
    .addEdge("return_refusal", END);

  return workflow.compile({
    ...(checkpointer ? { checkpointer } : {}),
    ...(store ? { store } : {}),
  }) as PlannerWorkflow;
};

let workflowPromise: Promise<PlannerWorkflow> | null = null;
let workflow: PlannerWorkflow | null = null;

export const getOrInitPlannerWorkflow = async (): Promise<PlannerWorkflow> => {
  if (workflow) {
    return workflow;
  }

  if (!workflowPromise) {
    workflowPromise = (async () => {
      const [fastModel, reasoningModel, checkpointer, store] =
        await Promise.all([
          createFastModel(),
          createReasoningModel(),
          getOrInitCheckpointer(),
          getOrInitStore(),
        ]);

      workflow = createPlannerWorkflow({
        checkpointer,
        intakeWorkflow: createPlannerIntakeWorkflow({
          model: fastModel,
        }),
        preparationWorkflow: createPlannerPreparationWorkflow({
          model: reasoningModel,
        }),
        generationWorkflow: createPlannerGenerationWorkflow({
          model: reasoningModel,
        }),
        store,
      });

      return workflow;
    })().finally(() => {
      workflowPromise = null;
    });
  }

  return workflowPromise;
};
