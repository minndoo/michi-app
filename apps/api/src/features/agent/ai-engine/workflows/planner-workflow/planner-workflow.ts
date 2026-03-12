import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";
import type { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import type {
  AgentPlannedGoalWithTasks,
  AgentRefusal,
  PlannerAction,
  PlanIntakeAccepted,
  PlanIntakeAcceptedDraft,
  PlanPreparationAccepted,
  PlanPlannerQuestion,
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
  intakeAccepted: PlanIntakeAcceptedDraft | null;
  preparationAccepted: PlanPreparationAccepted | null;
  plannerQuestions: PlanPlannerQuestion[] | null;
  response: string;
  plannerAction: PlannerAction | null;
  plan: AgentPlannedGoalWithTasks | null;
  refusal: AgentRefusal | null;
};

export type PlannerWorkflowInput = PlanningSharedState & {
  input: string;
  routedIntent: RoutedIntent;
  planningStage?: PlanningStage;
  intakeAccepted?: PlanIntakeAcceptedDraft | null;
  preparationAccepted?: PlanPreparationAccepted | null;
  plannerQuestions?: PlanPlannerQuestion[] | null;
  response?: string;
  plannerAction?: PlannerAction | null;
  plan?: AgentPlannedGoalWithTasks | null;
  refusal?: AgentRefusal | null;
};
export type PlannerWorkflowState = PlannerState;
type PlannerWorkflowConfig = RunnableConfig & {
  configurable?: {
    checkpoint_ns?: string;
    thread_id: string;
  };
  streamMode?: "updates";
};
export type PlannerWorkflow = {
  invoke: (
    state: PlannerWorkflowInput,
    config?: {
      configurable?: {
        checkpoint_ns?: string;
        thread_id: string;
      };
    },
  ) => Promise<PlannerWorkflowState>;
  stream: (
    state: PlannerWorkflowInput,
    config?: PlannerWorkflowConfig,
  ) => Promise<AsyncIterable<unknown>>;
  getState: (config: {
    configurable?: {
      checkpoint_ns?: string;
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
  questionAnswers: Annotation<PlanningSharedState["questionAnswers"]>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  input: Annotation<string>(),
  routedIntent: Annotation<RoutedIntent>({
    reducer: (_, update) => update,
  }),
  planningStage: Annotation<PlanningStage>({
    reducer: (_, update) => update ?? "intake",
    default: () => "intake",
  }),
  intakeAccepted: Annotation<PlanIntakeAcceptedDraft | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  preparationAccepted: Annotation<PlanPreparationAccepted | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  plannerQuestions: Annotation<PlanPlannerQuestion[] | null>({
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

const buildPlanResponse = (plan: AgentPlannedGoalWithTasks): string =>
  `Created a plan with ${plan.tasks.length} tasks.`;

const buildRefusalResponse = (refusal: AgentRefusal): string => refusal.reason;

const buildWaitingResponse = (questions: PlanPlannerQuestion[]): string => {
  if (questions.length === 1) {
    return questions[0]!.question.question;
  }

  const listedQuestions = questions
    .map((question, index) => `${index + 1}. ${question.question.question}`)
    .join("\n");

  return `Please answer the following:\n${listedQuestions}`;
};

const hasNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasValidDaysWeeklyFrequency = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= 7;

const hasCompleteIntakeAccepted = (
  intakeAccepted: PlanIntakeAcceptedDraft | null,
): intakeAccepted is PlanIntakeAccepted =>
  intakeAccepted != null &&
  hasNonEmptyString(intakeAccepted.goal) &&
  hasNonEmptyString(intakeAccepted.baseline) &&
  hasNonEmptyString(intakeAccepted.startDate) &&
  hasNonEmptyString(intakeAccepted.dueDate) &&
  hasValidDaysWeeklyFrequency(intakeAccepted.daysWeeklyFrequency);

const hasCompletePreparationAccepted = (
  preparationAccepted: PlanPreparationAccepted | null,
): preparationAccepted is PlanPreparationAccepted =>
  preparationAccepted != null &&
  hasNonEmptyString(preparationAccepted.goal) &&
  hasNonEmptyString(preparationAccepted.baseline) &&
  hasNonEmptyString(preparationAccepted.startDate) &&
  hasNonEmptyString(preparationAccepted.dueDate) &&
  hasValidDaysWeeklyFrequency(preparationAccepted.daysWeeklyFrequency) &&
  typeof preparationAccepted.goalAssumedValue === "number" &&
  Number.isFinite(preparationAccepted.goalAssumedValue) &&
  typeof preparationAccepted.baselineAssumedValue === "number" &&
  Number.isFinite(preparationAccepted.baselineAssumedValue) &&
  typeof preparationAccepted.gap === "number" &&
  Number.isFinite(preparationAccepted.gap) &&
  typeof preparationAccepted.timeFrame === "number" &&
  Number.isFinite(preparationAccepted.timeFrame) &&
  typeof preparationAccepted.availableDays === "number" &&
  Number.isFinite(preparationAccepted.availableDays) &&
  typeof preparationAccepted.gapClosingFrequency === "number" &&
  Number.isFinite(preparationAccepted.gapClosingFrequency);

const runIntake = async (
  state: PlannerWorkflowState,
  intakeWorkflow: PlannerIntakeWorkflow,
): Promise<Partial<PlannerWorkflowState>> => {
  const result = await intakeWorkflow.invoke({
    threadId: state.threadId,
    userId: state.userId,
    referenceDate: state.referenceDate,
    timezone: state.timezone,
    questionAnswers: state.questionAnswers,
    input: state.input,
    accepted: state.intakeAccepted,
    waiting: null,
  });

  if (result.waiting) {
    return {
      intakeAccepted: result.accepted,
      planningStage: "intake",
      plannerQuestions: result.waiting.questions,
      response: buildWaitingResponse(result.waiting.questions),
      plannerAction: null,
      plan: null,
      refusal: null,
    };
  }

  return {
    intakeAccepted: result.accepted,
    planningStage: "preparation",
    plannerQuestions: null,
  };
};

const runPreparation = async (
  state: PlannerWorkflowState,
  preparationWorkflow: PlannerPreparationWorkflow,
): Promise<Partial<PlannerWorkflowState>> => {
  if (!hasCompleteIntakeAccepted(state.intakeAccepted)) {
    const refusal: AgentRefusal = {
      reason: "The planning session is missing required intake details.",
      proposals: [
        "Start a new planning request from /message.",
        "Continue with a thread that has complete intake details.",
      ],
    };

    return {
      planningStage: "preparation",
      plannerAction: "refuse_plan",
      plannerQuestions: null,
      response: buildRefusalResponse(refusal),
      plan: null,
      refusal,
    };
  }

  const result = await preparationWorkflow.invoke({
    threadId: state.threadId,
    userId: state.userId,
    referenceDate: state.referenceDate,
    timezone: state.timezone,
    questionAnswers: state.questionAnswers,
    input: state.input,
    intakeAccepted: state.intakeAccepted,
    accepted: state.preparationAccepted,
    waiting: null,
  });

  if (result.waiting) {
    return {
      planningStage: "preparation",
      plannerQuestions: result.waiting.questions,
      response: buildWaitingResponse(result.waiting.questions),
      plannerAction: null,
      plan: null,
      refusal: null,
    };
  }

  return {
    preparationAccepted: result.accepted,
    planningStage: "generation",
    plannerQuestions: null,
  };
};

const runGeneration = async (
  state: PlannerWorkflowState,
  generationWorkflow: PlannerGenerationWorkflow,
): Promise<Partial<PlannerWorkflowState>> => {
  if (!hasCompletePreparationAccepted(state.preparationAccepted)) {
    const refusal: AgentRefusal = {
      reason: "The planning session is missing required preparation details.",
      proposals: [
        "Start a new planning request from /message.",
        "Continue with a thread that has complete preparation details.",
      ],
    };

    return {
      planningStage: "generation",
      plannerAction: "refuse_plan",
      plannerQuestions: null,
      response: buildRefusalResponse(refusal),
      plan: null,
      refusal,
    };
  }

  const result = await generationWorkflow.invoke({
    threadId: state.threadId,
    userId: state.userId,
    referenceDate: state.referenceDate,
    timezone: state.timezone,
    input: state.input,
    preparationAccepted: state.preparationAccepted,
    plannerAction: state.plannerAction,
    plan: state.plan,
    refusal: state.refusal,
  });

  if (result.plannerAction === "refuse_plan" && result.refusal) {
    return {
      plannerAction: "refuse_plan",
      plannerQuestions: null,
      response: buildRefusalResponse(result.refusal),
      plan: null,
      refusal: result.refusal,
    };
  }

  return {
    plannerAction: "create_plan",
    plannerQuestions: null,
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
      if (state.plannerAction === "refuse_plan") {
        return "return_refusal";
      }

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
