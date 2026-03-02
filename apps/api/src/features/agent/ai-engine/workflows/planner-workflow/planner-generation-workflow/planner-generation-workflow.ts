import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type {
  AgentPlannedGoalWithTasks,
  AgentRefusal,
  PlanningSharedState,
  PlanPreparationAccepted,
} from "../../../../agent.types.js";
import { generationIntentSchema } from "./schemas.js";

type PlannerGenerationState = PlanningSharedState & {
  input: string;
  preparationAccepted: PlanPreparationAccepted;
  plannerAction: "create_plan" | "refuse_plan" | null;
  plan: AgentPlannedGoalWithTasks | null;
  refusal: AgentRefusal | null;
};

export type PlannerGenerationWorkflowInput = PlannerGenerationState;
export type PlannerGenerationWorkflowState = PlannerGenerationState;
export type PlannerGenerationWorkflow = {
  invoke: (
    state: PlannerGenerationWorkflowState,
  ) => Promise<PlannerGenerationWorkflowState>;
};

type CreatePlannerGenerationWorkflowDeps = {
  model: BaseChatModel;
};

const PlannerGenerationStateAnnotation = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  referenceDate: Annotation<string>(),
  timezone: Annotation<string>(),
  input: Annotation<string>(),
  preparationAccepted: Annotation<PlanPreparationAccepted>({
    reducer: (_, update) => update,
  }),
  plannerAction: Annotation<"create_plan" | "refuse_plan" | null>({
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

const buildPrompt = (state: PlannerGenerationWorkflowState): string => `
Evaluate whether the plan is possible and either create a plan or refuse it.

Reference date: ${state.referenceDate}
Timezone: ${state.timezone}

Prepared input:
${JSON.stringify(state.preparationAccepted, null, 2)}
`;

const fallbackPlan = (
  state: PlannerGenerationWorkflowState,
): AgentPlannedGoalWithTasks => ({
  goal: {
    title: state.preparationAccepted.goal,
    description: state.preparationAccepted.baseline,
    dueAt: state.preparationAccepted.dueDate,
  },
  tasks: [
    {
      title: "Start working toward the goal",
      description: `Spend ${state.preparationAccepted.daysWeeklyFrequency} days per week progressing toward the goal.`,
      dueAt: state.preparationAccepted.startDate,
    },
    {
      title: "Review progress",
      description: "Check progress and adjust the plan if needed.",
      dueAt: state.preparationAccepted.dueDate,
    },
  ],
});

const llmCallPlannerGeneration = async (
  state: PlannerGenerationWorkflowState,
  model: BaseChatModel,
): Promise<Partial<PlannerGenerationWorkflowState>> => {
  const structuredModel = model.withStructuredOutput(generationIntentSchema);

  try {
    const response = await structuredModel.invoke(buildPrompt(state));

    if (response.intent === "refuse_plan") {
      return {
        plannerAction: "refuse_plan",
        plan: null,
        refusal: {
          reason: response.reason,
          proposals: response.proposals,
        },
      };
    }

    return {
      plannerAction: "create_plan",
      plan: {
        goal: response.goal,
        tasks: response.tasks,
      },
      refusal: null,
    };
  } catch (error) {
    console.error("LLM generation failed, using fallback plan", {
      threadId: state.threadId,
      userId: state.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      plannerAction: "create_plan",
      plan: fallbackPlan(state),
      refusal: null,
    };
  }
};

export const createPlannerGenerationWorkflow = ({
  model,
}: CreatePlannerGenerationWorkflowDeps): PlannerGenerationWorkflow => {
  const workflow = new StateGraph(PlannerGenerationStateAnnotation)
    .addNode("llmCallPlannerGeneration", (state) =>
      llmCallPlannerGeneration(state, model),
    )
    .addEdge(START, "llmCallPlannerGeneration")
    .addEdge("llmCallPlannerGeneration", END);

  return workflow.compile() as PlannerGenerationWorkflow;
};
