import type { AgentEngineResult } from "../agent.types.js";
import type { PlannedGoalWithTasks } from "./agent.schemas.js";
import type {
  RouterWorkflow,
  RouterWorkflowState,
} from "./router-model/router-workflow.js";
import { getOrInitRouterWorkflow } from "./router-model/router-workflow.js";

type InvokeArgs = {
  input: string;
  threadId: string;
  userId: string;
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

const createRouterInputState = ({
  input,
  threadId,
  userId,
}: InvokeArgs): RouterWorkflowState => ({
  threadId,
  userId,
  input,
  intent: null,
  response: "",
  plannerAction: null,
  plan: null,
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
          threadId: args.threadId,
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
    args: InvokeArgs,
    result: RouterWorkflowState,
  ): void {
    if (result.intent !== "plan_goal") {
      return;
    }

    if (result.plannerAction === "create_plan" && result.plan) {
      this.logPlanSuccess(args, result.plan);
      return;
    }

    console.log("AI engine plan_goal refusal", {
      plannerAction: result.plannerAction ?? "refuse_plan",
      response: result.response,
      threadId: args.threadId,
      userId: args.userId,
    });
  }

  private logPlanSuccess(args: InvokeArgs, plan: PlannedGoalWithTasks): void {
    console.log("AI engine plan_goal success", {
      plan: JSON.stringify(plan, null, 2),
      threadId: args.threadId,
      userId: args.userId,
    });
  }

  async invokeRouter(args: InvokeArgs): Promise<AgentEngineResult> {
    await this.getOrInit(args);

    const result = await this.routerWorkflow!.invoke(
      createRouterInputState(args),
      {
        configurable: {
          thread_id: args.threadId,
          checkpoint_ns: args.userId,
        },
      },
    );

    const routedIntent = result.intent ?? "refuse";

    this.logPlannerOutcome(args, result);

    return {
      routedIntent,
      response: result.response || routedIntent,
      ...(routedIntent === "plan_goal" && result.plannerAction
        ? { plannerAction: result.plannerAction }
        : {}),
    };
  }
}
