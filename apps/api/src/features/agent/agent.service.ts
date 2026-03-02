import { aiEngine } from "./ai-engine/index.js";
import type {
  AgentEngineResult,
  AgentMessageInput,
  AgentMessageResponse,
  AgentPlanGoalInput,
  AgentPlanGoalResponse,
  UserGoalPlanInput,
} from "./agent.types.js";

// TODO(AI Engine - Context engineering): ThreadID logic, creation and their persistence
type AgentServiceDeps = {
  engine: {
    invokeRouter: (args: {
      input: string;
      threadId: string;
      userId: string;
      timezone: string;
    }) => Promise<AgentEngineResult>;
    planGoal: (args: {
      threadId?: string | null;
      timezone: string;
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
      threadId: input.threadId,
      timezone: input.timezone,
    });

    return {
      threadId: input.threadId,
      routedIntent: result.routedIntent,
      response: result.response,
      ...(result.plannerAction ? { plannerAction: result.plannerAction } : {}),
      ...(result.refusal ? { refusal: result.refusal } : {}),
    };
  }

  async planGoal(
    userId: string,
    input: AgentPlanGoalInput,
  ): Promise<AgentPlanGoalResponse> {
    const result = await this.deps.engine.planGoal({
      userId,
      threadId: input.threadId,
      timezone: input.timezone,
      userGoalPlanInput: input.planGoalInput,
    });

    return {
      routedIntent: result.routedIntent,
      response: result.response,
      ...(result.plannerAction ? { plannerAction: result.plannerAction } : {}),
      ...(result.plan ? { plan: result.plan } : {}),
      ...(result.refusal ? { refusal: result.refusal } : {}),
    };
  }
}

export const agentService = new AgentService({
  engine: aiEngine,
});

export { AgentService };
