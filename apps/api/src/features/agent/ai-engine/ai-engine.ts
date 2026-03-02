import type { AgentEngineResult, PlanningSharedState } from "../agent.types.js";
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
  input: string;
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
  timezone,
}: Pick<
  InvokeArgs,
  "threadId" | "userId" | "timezone"
>): PlanningSharedState => ({
  threadId,
  userId,
  referenceDate,
  timezone,
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

const createMissingCheckpointResult = (): AgentEngineResult => ({
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
    const snapshot = await plannerWorkflow.getState({
      configurable: {
        checkpoint_ns: args.userId,
        thread_id: args.threadId,
      },
    });

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

  async invokePlanner(args: InvokePlannerArgs): Promise<AgentEngineResult> {
    const plannerWorkflow = await this.getPlannerWorkflow(args);

    if (args.requireCheckpoint && !(await this.hasPlannerCheckpoint(args))) {
      return createMissingCheckpointResult();
    }

    const plannerState = await plannerWorkflow.invoke(
      createPlannerState(args),
      {
        configurable: {
          thread_id: args.threadId,
          checkpoint_ns: args.userId,
        },
      },
    );

    this.logPlannerOutcome(args, plannerState);

    return {
      routedIntent: "plan_goal",
      response: plannerState.response || "plan_goal",
      ...(plannerState.plannerAction
        ? { plannerAction: plannerState.plannerAction }
        : {}),
      ...(plannerState.plan ? { plan: plannerState.plan } : {}),
      ...(plannerState.refusal ? { refusal: plannerState.refusal } : {}),
    };
  }

  async invokeRouter(args: InvokeArgs): Promise<AgentEngineResult> {
    const routerWorkflow = await this.getRouterWorkflow(args);

    const state = createRouterState(args);
    const routerResult = await routerWorkflow.invoke(state, {
      configurable: {
        thread_id: state.threadId,
        checkpoint_ns: args.userId,
      },
    });
    const routedIntent = routerResult.intent ?? "refuse";

    if (routedIntent !== "plan_goal") {
      return {
        routedIntent,
        response: routedIntent,
      };
    }

    return this.invokePlanner(args);
  }
}
