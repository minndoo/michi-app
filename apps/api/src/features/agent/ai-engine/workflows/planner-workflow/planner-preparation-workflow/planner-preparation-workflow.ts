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

const computeMetrics = ({
  goalAssumedValue,
  baselineAssumedValue,
  startDate,
  dueDate,
  daysWeeklyFrequency,
}: {
  goalAssumedValue: number;
  baselineAssumedValue: number;
  startDate: string;
  dueDate: string;
  daysWeeklyFrequency: number;
}) => {
  const gap = goalAssumedValue - baselineAssumedValue;
  const timeFrame = Math.floor(
    (new Date(dueDate).getTime() - new Date(startDate).getTime()) / 86400000,
  );
  const availableDays = Math.floor((timeFrame / 7) * daysWeeklyFrequency);

  return {
    gap,
    timeFrame,
    availableDays,
    gapClosingFrequency:
      availableDays > 0 ? Math.floor(gap / availableDays) : null,
  };
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
For accepted output:
- Quantify goalAssumedValue on a 1-100 scale.
- Quantify baselineAssumedValue on a 1-100 scale.
- If either value is ambiguous and cannot be confidently quantified, return waiting.
- Resolve relative date expressions from intake using referenceDate.
- Keep startDate and dueDate as normalized ISO datetime strings.
`;
};

const fallbackAccepted = (
  state: PlannerPreparationWorkflowState,
): PlanPreparationAccepted => {
  const startDate = state.intakeAccepted.startDate ?? state.referenceDate;
  const dueDate =
    state.intakeAccepted.dueDate ?? addDays(state.referenceDate, 30);
  const metrics = computeMetrics({
    goalAssumedValue: 70,
    baselineAssumedValue: 30,
    startDate,
    dueDate,
    daysWeeklyFrequency: state.intakeAccepted.daysWeeklyFrequency,
  });

  return {
    goal: state.intakeAccepted.goal,
    baseline: state.intakeAccepted.baseline,
    startDate,
    dueDate,
    daysWeeklyFrequency: state.intakeAccepted.daysWeeklyFrequency,
    goalAssumedValue: 70,
    baselineAssumedValue: 30,
    gap: metrics.gap,
    timeFrame: metrics.timeFrame,
    availableDays: metrics.availableDays,
    gapClosingFrequency: metrics.gapClosingFrequency ?? 0,
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

    const metrics = computeMetrics({
      goalAssumedValue: response.goalAssumedValue,
      baselineAssumedValue: response.baselineAssumedValue,
      startDate: response.startDate,
      dueDate: response.dueDate,
      daysWeeklyFrequency: response.daysWeeklyFrequency,
    });

    if (metrics.availableDays <= 0 || metrics.gapClosingFrequency == null) {
      return {
        accepted: null,
        waiting: {
          questions: [
            {
              stage: "preparation",
              question: {
                field: "dueDate",
                question:
                  "Your current timeframe does not include any available working days. Please adjust due date and/or days per week.",
              },
              placeholder: "Example: due in 8 weeks and 3 days per week",
              inputHint: "free_text",
            },
          ],
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
        goalAssumedValue: response.goalAssumedValue,
        baselineAssumedValue: response.baselineAssumedValue,
        gap: metrics.gap,
        timeFrame: metrics.timeFrame,
        availableDays: metrics.availableDays,
        gapClosingFrequency: metrics.gapClosingFrequency,
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
