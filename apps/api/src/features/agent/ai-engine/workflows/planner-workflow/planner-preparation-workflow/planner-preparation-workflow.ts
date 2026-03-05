import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type {
  PlanIntakeAccepted,
  PlanPreparationAccepted,
  PlanPreparationWaiting,
  PlanningSharedState,
} from "../../../../agent.types.js";
import { preparationAcceptedSchema } from "./schemas.js";
import { createClarification } from "../planner-clarification.js";

type PlannerPreparationState = PlanningSharedState & {
  input: string;
  intakeAccepted: PlanIntakeAccepted;
  accepted: PlanPreparationAccepted | null;
  waiting: PlanPreparationWaiting | null;
};

export type PlannerPreparationWorkflowInput = PlannerPreparationState;
export type PlannerPreparationWorkflowState = PlannerPreparationState;
export type PlannerPreparationWorkflow = {
  invoke: (
    state: PlannerPreparationWorkflowState,
  ) => Promise<PlannerPreparationWorkflowState>;
};

type CreatePlannerPreparationWorkflowDeps = {
  model: BaseChatModel;
};

const PlannerPreparationStateAnnotation = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  referenceDate: Annotation<string>(),
  timezone: Annotation<string>(),
  questionAnswers: Annotation<PlanningSharedState["questionAnswers"]>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  input: Annotation<string>(),
  intakeAccepted: Annotation<PlanIntakeAccepted>({
    reducer: (_, update) => update,
  }),
  accepted: Annotation<PlanPreparationAccepted | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  waiting: Annotation<PlanPreparationWaiting | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
});

const addDays = (isoDate: string, days: number): string => {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

const buildPrompt = (state: PlannerPreparationWorkflowState): string => {
  const clarification = state.questionAnswers?.length
    ? createClarification(state.questionAnswers)
    : null;

  return `
Normalize and clarify the intake planning input.

Reference date: ${state.referenceDate}
Timezone: ${state.timezone}

Input:
${JSON.stringify(state.intakeAccepted, null, 2)}

${
  clarification
    ? `Clarifications:
${clarification}

`
    : ""
}Return either:
- accepted normalized planning input
- waiting with one or more question objects under questions[] containing question.field, question.question, placeholder, and inputHint
Ask clarification questions when input remains ambiguous.
`;
};

const fallbackAccepted = (
  state: PlannerPreparationWorkflowState,
): PlanPreparationAccepted => {
  const startDate = state.intakeAccepted.startDate ?? state.referenceDate;
  const dueDate =
    state.intakeAccepted.dueDate ?? addDays(state.referenceDate, 30);

  return {
    goal: state.intakeAccepted.goal,
    baseline: state.intakeAccepted.baseline,
    startDate,
    dueDate,
    daysWeeklyFrequency: state.intakeAccepted.daysWeeklyFrequency,
    goalDerivedValue: 70,
    baselineDerivedValue: 30,
    goalBaselineGap: 40,
  };
};

const llmCallPlannerPreparation = async (
  state: PlannerPreparationWorkflowState,
  model: BaseChatModel,
): Promise<Partial<PlannerPreparationWorkflowState>> => {
  const structuredModel = model.withStructuredOutput(preparationAcceptedSchema);

  try {
    const response = await structuredModel.invoke(buildPrompt(state));

    if (response.status === "waiting") {
      return {
        accepted: null,
        waiting: {
          questions: response.questions.map((question) => ({
            stage: "preparation",
            question: question.question,
            placeholder: question.placeholder,
            inputHint: question.inputHint,
          })),
        },
      };
    }

    return {
      accepted: {
        goal: response.goal,
        baseline: response.baseline,
        startDate: response.startDate,
        dueDate: response.dueDate,
        daysWeeklyFrequency: response.daysWeeklyFrequency,
        goalDerivedValue: response.goalDerivedValue,
        baselineDerivedValue: response.baselineDerivedValue,
        goalBaselineGap: response.goalBaselineGap,
      },
      waiting: null,
    };
  } catch {
    return {
      accepted: fallbackAccepted(state),
      waiting: null,
    };
  }
};

export const createPlannerPreparationWorkflow = ({
  model,
}: CreatePlannerPreparationWorkflowDeps): PlannerPreparationWorkflow => {
  const workflow = new StateGraph(PlannerPreparationStateAnnotation)
    .addNode("llmCallPlannerPreparation", (state) =>
      llmCallPlannerPreparation(state, model),
    )
    .addEdge(START, "llmCallPlannerPreparation")
    .addEdge("llmCallPlannerPreparation", END);

  return workflow.compile() as PlannerPreparationWorkflow;
};
