import type {
  AgentJobType,
  AgentMessageResponse,
  AgentStreamEvent,
  PlannerQuestionClarification,
  PlanningSharedState,
  RoutedIntent,
} from "../agent.types.js";
import type {
  PlannerWorkflow,
  PlannerWorkflowInput,
  PlannerWorkflowState,
} from "./workflows/planner-workflow/planner-workflow.js";
import { getOrInitPlannerWorkflow } from "./workflows/planner-workflow/planner-workflow.js";
import type {
  RouterWorkflow,
  RouterWorkflowInput,
} from "./workflows/router-workflow/router-workflow.js";
import { getOrInitRouterWorkflow } from "./workflows/router-workflow/router-workflow.js";

type InvokeArgs = {
  jobId: string;
  jobType: AgentJobType;
  input: string;
  questionAnswers?: PlannerQuestionClarification[] | null;
  threadId: string;
  userId: string;
  timezone: string;
};

type InvokePlannerArgs = InvokeArgs & {
  requireCheckpoint?: boolean;
};

type AiEngineDeps = {
  routerWorkflow?: RouterWorkflow;
  plannerWorkflow?: PlannerWorkflow;
  factories?: Partial<AiEngineFactories>;
};

type AiEngineFactories = {
  getOrInitPlannerWorkflow: typeof getOrInitPlannerWorkflow;
  getOrInitRouterWorkflow: typeof getOrInitRouterWorkflow;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
};

export class AiEngineUnavailableError extends Error {
  cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "AiEngineUnavailableError";
    this.cause = cause;
  }
}

// TODO(agent): Recompute this per request once planner continuation loads state
// from persisted memory/checkpoints instead of relying on fresh invocation input.
const referenceDate = new Date().toISOString();

const createSharedState = ({
  threadId,
  userId,
  questionAnswers,
  timezone,
}: Pick<
  InvokeArgs,
  "threadId" | "userId" | "timezone" | "questionAnswers"
>): PlanningSharedState => ({
  threadId,
  userId,
  referenceDate,
  timezone,
  questionAnswers: questionAnswers ?? null,
});

const createRouterState = (args: InvokeArgs): RouterWorkflowInput => ({
  ...createSharedState(args),
  input: args.input,
  intent: null,
});

const createPlannerState = (args: InvokeArgs): PlannerWorkflowInput => ({
  ...createSharedState(args),
  input: args.input,
  // TODO(agent): Load planner continuation state from persisted memory/checkpoints
  // instead of relying on fresh invocation input during further memory work.
  routedIntent: "plan_goal",
});

const createMissingCheckpointResponse = (
  threadId: string,
): AgentMessageResponse => ({
  threadId,
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
});

const getPlannerCheckpointThreadId = (args: InvokeArgs): string =>
  `${args.userId}:${args.threadId}`;

const getRouterCheckpointThreadId = (args: InvokeArgs): string =>
  `${args.userId}:router:${args.threadId}`;

const getRouterCheckpointConfig = (args: InvokeArgs) => ({
  configurable: {
    thread_id: getRouterCheckpointThreadId(args),
  },
});

const getPlannerCheckpointConfig = (args: InvokeArgs) => ({
  configurable: {
    thread_id: getPlannerCheckpointThreadId(args),
  },
});

const toRouterMessageResponse = ({
  threadId,
  routedIntent,
}: {
  threadId: string;
  routedIntent: Exclude<RoutedIntent, "plan_goal">;
}): AgentMessageResponse => ({
  threadId,
  routedIntent,
  response: routedIntent,
});

const toPlannerMessageResponse = ({
  threadId,
  plannerState,
}: {
  threadId: string;
  plannerState: PlannerWorkflowState;
}): AgentMessageResponse => ({
  threadId,
  routedIntent: "plan_goal",
  response: plannerState.response || "plan_goal",
  ...(plannerState.plannerAction
    ? { plannerAction: plannerState.plannerAction }
    : {}),
  ...(plannerState.plannerQuestions
    ? { plannerQuestions: plannerState.plannerQuestions }
    : {}),
  ...(plannerState.plan ? { plan: plannerState.plan } : {}),
  ...(plannerState.refusal ? { refusal: plannerState.refusal } : {}),
});

const isWaitingPlannerResponse = (result: AgentMessageResponse): boolean =>
  result.routedIntent === "plan_goal" &&
  ((result.plannerQuestions?.length ?? 0) > 0 ||
    (result.plannerAction == null &&
      result.plan == null &&
      result.refusal == null));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toStreamUpdateRecord = (chunk: unknown): Record<string, unknown> => {
  if (Array.isArray(chunk)) {
    const lastItem = chunk.at(-1);
    return isRecord(lastItem) ? lastItem : {};
  }

  return isRecord(chunk) ? chunk : {};
};

const getNodeUpdate = (
  chunk: unknown,
  nodeName: string,
): Record<string, unknown> | null => {
  const updates = toStreamUpdateRecord(chunk);
  const nodeUpdate = updates[nodeName];
  return isRecord(nodeUpdate) ? nodeUpdate : null;
};

const getRoutedIntentFromChunk = (chunk: unknown): RoutedIntent | null => {
  const nodeUpdate = getNodeUpdate(chunk, "llmCallRouter");
  const intent = nodeUpdate?.intent;

  return typeof intent === "string" ? (intent as RoutedIntent) : null;
};

const plannerNodeNames = [
  "run_intake",
  "run_preparation",
  "run_generation",
  "return_waiting",
  "return_plan",
  "return_refusal",
] as const;

const createPlannerAccumulatedState = (
  args: InvokeArgs,
): PlannerWorkflowState => ({
  ...createPlannerState(args),
  planningStage: "intake",
  response: "",
  plannerAction: null,
  plannerQuestions: null,
  plan: null,
  refusal: null,
  intakeAccepted: null,
  preparationAccepted: null,
});

const mergePlannerStreamUpdate = (
  current: PlannerWorkflowState,
  chunk: unknown,
): PlannerWorkflowState => {
  let nextState = current;

  for (const nodeName of plannerNodeNames) {
    const nodeUpdate = getNodeUpdate(chunk, nodeName);

    if (!nodeUpdate) {
      continue;
    }

    nextState = {
      ...nextState,
      ...nodeUpdate,
    };
  }

  return nextState;
};

const getPlannerStageFromChunk = (
  chunk: unknown,
): {
  stage: "intake" | "preparation" | "generation";
  payload: Record<string, unknown>;
} | null => {
  const intakeUpdate = getNodeUpdate(chunk, "run_intake");

  if (intakeUpdate) {
    return {
      stage: "intake",
      payload: intakeUpdate,
    };
  }

  const preparationUpdate = getNodeUpdate(chunk, "run_preparation");

  if (preparationUpdate) {
    return {
      stage: "preparation",
      payload: preparationUpdate,
    };
  }

  const generationUpdate = getNodeUpdate(chunk, "run_generation");

  if (generationUpdate) {
    return {
      stage: "generation",
      payload: generationUpdate,
    };
  }

  return null;
};

export class AiEngine {
  private plannerWorkflow: PlannerWorkflow | null;
  private routerWorkflow: RouterWorkflow | null;
  private readonly factories: AiEngineFactories;

  constructor(deps: AiEngineDeps = {}) {
    this.routerWorkflow = deps.routerWorkflow ?? null;
    this.plannerWorkflow = deps.plannerWorkflow ?? null;
    this.factories = {
      getOrInitPlannerWorkflow,
      getOrInitRouterWorkflow,
      ...deps.factories,
    };
  }

  private async getPlannerWorkflow(args: InvokeArgs): Promise<PlannerWorkflow> {
    if (this.plannerWorkflow) {
      return this.plannerWorkflow;
    }

    try {
      const workflow = await this.factories.getOrInitPlannerWorkflow();
      this.plannerWorkflow = workflow;

      return workflow;
    } catch (error: unknown) {
      console.error("AI engine planner initialization failed", {
        error: getErrorMessage(error),
        threadId: args.threadId,
        userId: args.userId,
      });

      throw new AiEngineUnavailableError(
        "Agent service temporarily unavailable",
        error,
      );
    }
  }

  private async getRouterWorkflow(args: InvokeArgs): Promise<RouterWorkflow> {
    if (this.routerWorkflow) {
      return this.routerWorkflow;
    }

    try {
      const workflow = await this.factories.getOrInitRouterWorkflow();
      this.routerWorkflow = workflow;

      return workflow;
    } catch (error: unknown) {
      console.error("AI engine router initialization failed", {
        error: getErrorMessage(error),
        threadId: args.threadId,
        userId: args.userId,
      });

      throw new AiEngineUnavailableError(
        "Agent service temporarily unavailable",
        error,
      );
    }
  }

  private async hasPlannerCheckpoint(args: InvokeArgs): Promise<boolean> {
    const plannerWorkflow = await this.getPlannerWorkflow(args);
    const snapshot = await plannerWorkflow.getState(
      getPlannerCheckpointConfig(args),
    );

    return snapshot.createdAt != null || snapshot.metadata != null;
  }

  private logPlannerOutcome(
    args: InvokeArgs,
    result: PlannerWorkflowState,
  ): void {
    if (result.plannerAction === "create_plan" && result.plan) {
      console.log("AI engine plan_goal success", {
        plan: JSON.stringify(result.plan, null, 2),
        threadId: args.threadId,
        userId: args.userId,
      });
      return;
    }

    if (result.plannerAction !== "refuse_plan") {
      return;
    }

    console.log("AI engine plan_goal refusal", {
      plannerAction: result.plannerAction ?? "refuse_plan",
      response: result.response,
      reason: result.refusal?.reason,
      proposals: result.refusal?.proposals,
      threadId: args.threadId,
      userId: args.userId,
    });
  }

  async *streamPlanner(
    args: InvokePlannerArgs,
  ): AsyncGenerator<AgentStreamEvent> {
    yield {
      type: "planner_started",
      jobId: args.jobId,
      jobType: args.jobType,
      threadId: args.threadId,
    };

    if (args.requireCheckpoint && !(await this.hasPlannerCheckpoint(args))) {
      const response = createMissingCheckpointResponse(args.threadId);

      yield {
        type: "planner_completed",
        jobId: args.jobId,
        jobType: args.jobType,
        threadId: args.threadId,
        plannerAction: response.plannerAction,
      };
      yield {
        type: "result",
        jobId: args.jobId,
        jobType: args.jobType,
        threadId: args.threadId,
        response,
      };
      return;
    }

    const plannerWorkflow = await this.getPlannerWorkflow(args);
    const plannerStream = await plannerWorkflow.stream(
      createPlannerState(args),
      {
        ...getPlannerCheckpointConfig(args),
        streamMode: "updates",
      },
    );
    let plannerState = createPlannerAccumulatedState(args);

    for await (const chunk of plannerStream) {
      const plannerStage = getPlannerStageFromChunk(chunk);

      if (plannerStage) {
        yield {
          type: "planner_stage",
          jobId: args.jobId,
          jobType: args.jobType,
          threadId: args.threadId,
          stage: plannerStage.stage,
          payload: plannerStage.payload,
        };
      }

      plannerState = mergePlannerStreamUpdate(plannerState, chunk);
    }

    if (
      plannerState.response === "" &&
      plannerState.plannerAction == null &&
      plannerState.plan == null &&
      plannerState.refusal == null
    ) {
      throw new Error("Planner stream completed without a usable final state");
    }

    this.logPlannerOutcome(args, plannerState);

    const response = toPlannerMessageResponse({
      threadId: args.threadId,
      plannerState,
    });

    if (isWaitingPlannerResponse(response)) {
      if (!response.plannerQuestions?.length) {
        yield {
          type: "result",
          jobId: args.jobId,
          threadId: args.threadId,
          jobType: args.jobType,
          response,
        };
        return;
      }

      yield {
        type: "planner_waiting",
        jobId: args.jobId,
        jobType: args.jobType,
        threadId: args.threadId,
        stage: response.plannerQuestions[0]!.stage,
        questions: response.plannerQuestions,
      };
    } else {
      yield {
        type: "planner_completed",
        jobId: args.jobId,
        jobType: args.jobType,
        threadId: args.threadId,
        plannerAction: response.plannerAction,
      };
    }

    yield {
      type: "result",
      jobId: args.jobId,
      threadId: args.threadId,
      jobType: args.jobType,
      response,
    };
  }

  async *streamRouter(args: InvokeArgs): AsyncGenerator<AgentStreamEvent> {
    yield {
      type: "router_started",
      jobId: args.jobId,
      jobType: args.jobType,
      threadId: args.threadId,
    };

    const routerWorkflow = await this.getRouterWorkflow(args);
    const routerState = createRouterState(args);
    const routerStream = await routerWorkflow.stream(routerState, {
      ...getRouterCheckpointConfig(args),
      streamMode: "updates",
    });
    let routedIntent: RoutedIntent | null = null;

    for await (const chunk of routerStream) {
      const routedIntentCandidate = getRoutedIntentFromChunk(chunk);
      routedIntent = routedIntentCandidate ?? routedIntent;
    }

    if (routedIntent == null) {
      throw new Error("Router stream completed without a routed intent");
    }

    yield {
      type: "router_intent_resolved",
      jobId: args.jobId,
      jobType: args.jobType,
      threadId: args.threadId,
      routedIntent,
    };

    if (routedIntent !== "plan_goal") {
      yield {
        type: "result",
        jobId: args.jobId,
        jobType: args.jobType,
        threadId: args.threadId,
        response: toRouterMessageResponse({
          threadId: args.threadId,
          routedIntent,
        }),
      };
      return;
    }

    for await (const event of this.streamPlanner(args)) {
      yield event;
    }
  }
}
