import { aiEngine } from "./ai-engine/index.js";
import type {
  AgentEngineResult,
  AgentMessageInput,
  AgentMessageResponse,
  AgentPlanGoalInput,
  AgentPlanGoalResponse,
  UserGoalPlanInput,
} from "./agent.types.js";

type AgentServiceDeps = {
  engine: {
    invokeRouter: (args: {
      input: string;
      userId: string;
    }) => Promise<AgentEngineResult>;
    planGoal: (args: {
      userId: string;
      userGoalPlanInput: UserGoalPlanInput;
    }) => Promise<AgentEngineResult>;
  };
};

class AgentService {
  private readonly deps: AgentServiceDeps;

  constructor(deps: AgentServiceDeps) {
    this.deps = deps;
  }

  async runMessage(
    userId: string,
    input: AgentMessageInput,
  ): Promise<AgentMessageResponse> {
    const result = await this.deps.engine.invokeRouter({
      userId,
      input: input.message,
    });

    return {
      threadId: input.threadId,
      routedIntent: result.routedIntent,
      response: result.response,
      ...(result.plannerAction ? { plannerAction: result.plannerAction } : {}),
    };
  }

  async planGoal(
    userId: string,
    input: AgentPlanGoalInput,
  ): Promise<AgentPlanGoalResponse> {
    const result = await this.deps.engine.planGoal({
      userId,
      userGoalPlanInput: {
        goal: input.goal,
        dueDate: input.dueDate,
        startingPoint: input.startingPoint,
      },
    });

    return {
      routedIntent: result.routedIntent,
      response: result.response,
      ...(result.plannerAction ? { plannerAction: result.plannerAction } : {}),
      ...(result.plan ? { plan: result.plan } : {}),
    };
  }
}

export const agentService = new AgentService({
  engine: aiEngine,
});

export { AgentService };
