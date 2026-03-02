import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type {
  PlanIntakeAccepted,
  PlanIntakeDenied,
  PlanningSharedState,
} from "../../../../agent.types.js";
import { intakeAcceptedSchema } from "./schemas.js";

type PlannerIntakeState = PlanningSharedState & {
  input: string;
  accepted: PlanIntakeAccepted | null;
  denied: PlanIntakeDenied | null;
};

export type PlannerIntakeWorkflowInput = PlannerIntakeState;
export type PlannerIntakeWorkflowState = PlannerIntakeState;
export type PlannerIntakeWorkflow = {
  invoke: (
    state: PlannerIntakeWorkflowState,
  ) => Promise<PlannerIntakeWorkflowState>;
};

type CreatePlannerIntakeWorkflowDeps = {
  model: BaseChatModel;
};

const PlannerIntakeStateAnnotation = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  referenceDate: Annotation<string>(),
  timezone: Annotation<string>(),
  input: Annotation<string>(),
  accepted: Annotation<PlanIntakeAccepted | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  denied: Annotation<PlanIntakeDenied | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
});

const buildPrompt = (state: PlannerIntakeWorkflowState): string => `
Extract planning fields from the user input.

Reference date: ${state.referenceDate}
Timezone: ${state.timezone}

Required fields:
- goal
- baseline
- startDate or relativeStartDate
- dueDate or relativeDueDate
- daysWeeklyFrequency

Do not infer missing required fields if the input does not support them.

User input:
${state.input}
`;

const getMissingFields = (accepted: Partial<PlanIntakeAccepted>): string[] => {
  const missingFields: string[] = [];

  if (!accepted.goal?.trim()) {
    missingFields.push("goal");
  }

  if (!accepted.baseline?.trim()) {
    missingFields.push("baseline");
  }

  if (!accepted.startDate?.trim() && !accepted.relativeStartDate?.trim()) {
    missingFields.push("startDate");
  }

  if (!accepted.dueDate?.trim() && !accepted.relativeDueDate?.trim()) {
    missingFields.push("dueDate");
  }

  if (!accepted.daysWeeklyFrequency || accepted.daysWeeklyFrequency <= 0) {
    missingFields.push("daysWeeklyFrequency");
  }

  return missingFields;
};

const llmCallPlannerIntake = async (
  state: PlannerIntakeWorkflowState,
  model: BaseChatModel,
): Promise<Partial<PlannerIntakeWorkflowState>> => {
  const structuredModel = model.withStructuredOutput(intakeAcceptedSchema);
  const response = await structuredModel.invoke(buildPrompt(state));
  const partialAccepted = {
    ...state.accepted,
    ...response,
  };
  // TODO(AI Engine): Add error handling and retries for LLM calls.
  const missingFields = getMissingFields(partialAccepted);

  if (missingFields.length > 0) {
    return {
      accepted: null,
      denied: {
        reason: "Missing required planning fields.",
        missingFields,
      },
    };
  }

  return {
    accepted: partialAccepted as PlanIntakeAccepted,
    denied: null,
  };
};

export const createPlannerIntakeWorkflow = ({
  model,
}: CreatePlannerIntakeWorkflowDeps): PlannerIntakeWorkflow => {
  const workflow = new StateGraph(PlannerIntakeStateAnnotation)
    .addNode("llmCallPlannerIntake", (state) =>
      llmCallPlannerIntake(state, model),
    )
    .addEdge(START, "llmCallPlannerIntake")
    .addEdge("llmCallPlannerIntake", END);

  return workflow.compile() as PlannerIntakeWorkflow;
};
