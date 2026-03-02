import type { AgentEngineResult, UserGoalPlanInput } from "../agent.types.js";
import type { PlannedGoalWithTasks } from "./agent.schemas.js";
import type {
  RouterWorkflow,
  RouterWorkflowInput,
  RouterWorkflowState,
} from "./router-model/router-workflow.js";
import { getOrInitRouterWorkflow } from "./router-model/router-workflow.js";

type InvokeArgs = {
  input: string;
  threadId: string;
  userId: string;
  timezone: string;
};

type EngineRunArgs = InvokeArgs & {
  threadId: string;
};

type PlanGoalArgs = {
  threadId?: string | null;
  timezone: string;
  userId: string;
  userGoalPlanInput: UserGoalPlanInput;
};

type AiEngineDeps = {
  routerWorkflow?: RouterWorkflow;
  factories?: Partial<AiEngineFactories>;
};

type AiEngineFactories = {
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

const createBaseRouterState = ({
  threadId,
  userId,
  timezone,
}: Pick<
  InvokeArgs,
  "threadId" | "userId" | "timezone"
>): RouterWorkflowInput => ({
  threadId,
  userId,
  input: "",
  timezone,
});

const createRouterState = (args: InvokeArgs): RouterWorkflowInput => ({
  ...createBaseRouterState({
    threadId: args.threadId,
    userId: args.userId,
    timezone: args.timezone,
  }),
  input: args.input,
});

// TODO(AI Engine): make threadId mandatory
const createPlanGoalState = (args: PlanGoalArgs): RouterWorkflowInput => ({
  ...createBaseRouterState({
    threadId: args.threadId ?? args.userId,
    userId: args.userId,
    timezone: args.timezone,
  }),
  input: args.userGoalPlanInput.goal,
  userGoalPlanInput: args.userGoalPlanInput,
});

export class AiEngine {
  private routerWorkflow: RouterWorkflow | null;
  private initPromise: Promise<void> | null = null;
  private readonly factories: AiEngineFactories;

  constructor(deps: AiEngineDeps = {}) {
    this.routerWorkflow = deps.routerWorkflow ?? null;
    this.factories = {
      getOrInitRouterWorkflow,
      ...deps.factories,
    };
  }

  private async initialize(): Promise<void> {
    this.routerWorkflow = await this.factories.getOrInitRouterWorkflow();
  }

  private async getOrInit(args: InvokeArgs): Promise<void> {
    if (this.routerWorkflow) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = this.initialize().catch((error: unknown) => {
        console.error("AI engine initialization failed", {
          error: getErrorMessage(error),
          threadId: args.userId,
          userId: args.userId,
        });

        this.routerWorkflow = null;

        throw new AiEngineUnavailableError(
          "Agent service temporarily unavailable",
          error,
        );
      });
    }

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }

    if (!this.routerWorkflow) {
      throw new AiEngineUnavailableError(
        "Agent service temporarily unavailable",
        new Error("Router workflow is not initialized"),
      );
    }
  }

  private logPlannerOutcome(
    args: EngineRunArgs,
    result: RouterWorkflowState,
  ): void {
    if (result.intent !== "plan_goal") {
      return;
    }

    if (result.plannerAction === "create_plan" && result.plan) {
      this.logPlanSuccess(args, result.plan);
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

  private logPlanSuccess(
    args: EngineRunArgs,
    plan: PlannedGoalWithTasks,
  ): void {
    console.log("AI engine plan_goal success", {
      plan: JSON.stringify(plan, null, 2),
      threadId: args.threadId,
      userId: args.userId,
    });
  }

  async invokeRouter(args: InvokeArgs): Promise<AgentEngineResult> {
    await this.getOrInit(args);

    const state = createRouterState(args);

    const result = await this.routerWorkflow!.invoke(state, {
      configurable: {
        thread_id: state.threadId ?? args.userId,
        checkpoint_ns: args.userId,
      },
    });

    const routedIntent = result.intent ?? "refuse";

    this.logPlannerOutcome(
      {
        input: state.input ?? args.input,
        threadId: state.threadId ?? args.threadId,
        userId: args.userId,
        timezone: args.timezone,
      },
      result,
    );

    return {
      routedIntent,
      response: result.response || routedIntent,
      ...(routedIntent === "plan_goal" && result.plannerAction
        ? {
            plannerAction: result.plannerAction,
            ...(result.plan ? { plan: result.plan } : {}),
            ...(result.refusal ? { refusal: result.refusal } : {}),
          }
        : {}),
    };
  }

  async planGoal(args: PlanGoalArgs): Promise<AgentEngineResult> {
    const state = createPlanGoalState(args);

    await this.getOrInit({
      input: state.input ?? args.userGoalPlanInput.goal,
      threadId: state.threadId ?? args.threadId ?? args.userId,
      userId: args.userId,
      timezone: args.timezone,
    });

    const result = await this.routerWorkflow!.invoke(state, {
      configurable: {
        thread_id: state.threadId ?? args.userId,
        checkpoint_ns: args.userId,
      },
    });

    const routedIntent = result.intent ?? "refuse";

    this.logPlannerOutcome(
      {
        input: state.input ?? args.userGoalPlanInput.goal,
        threadId: state.threadId ?? args.threadId ?? args.userId,
        userId: args.userId,
        timezone: args.timezone,
      },
      result,
    );

    return {
      routedIntent,
      response: result.response || routedIntent,
      ...(result.plannerAction ? { plannerAction: result.plannerAction } : {}),
      ...(result.plan ? { plan: result.plan } : {}),
      ...(result.refusal ? { refusal: result.refusal } : {}),
    };
  }
}
