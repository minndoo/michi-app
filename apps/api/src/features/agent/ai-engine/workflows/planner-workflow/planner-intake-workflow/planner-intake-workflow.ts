import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type {
  PlanIntakeAccepted,
  PlanIntakeAcceptedDraft,
  PlanIntakeFieldKey,
  PlanIntakeWaiting,
  PlanPlannerQuestion,
  PlanningSharedState,
} from "../../../../agent.types.js";
import { intakeExtractionSchema } from "./schemas.js";

type PlannerIntakeState = PlanningSharedState & {
  input: string;
  accepted: PlanIntakeAcceptedDraft | null;
  waiting: PlanIntakeWaiting | null;
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
  questionAnswers: Annotation<PlanningSharedState["questionAnswers"]>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  input: Annotation<string>(),
  accepted: Annotation<PlanIntakeAcceptedDraft | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
  waiting: Annotation<PlanIntakeWaiting | null>({
    reducer: (_, update) => update ?? null,
    default: () => null,
  }),
});

const getUserDefinedFields = (
  state: PlannerIntakeWorkflowState,
): Partial<Record<PlanIntakeFieldKey, string>> => {
  const userDefinedFields: Partial<Record<PlanIntakeFieldKey, string>> = {};

  for (const questionAnswer of state.questionAnswers ?? []) {
    const trimmedAnswer = questionAnswer.answer.trim();

    if (!trimmedAnswer) {
      continue;
    }

    userDefinedFields[questionAnswer.field] = trimmedAnswer;
  }

  return userDefinedFields;
};

const buildPrompt = (state: PlannerIntakeWorkflowState): string => {
  const missingFields = getMissingFields(state.accepted ?? null);
  const alreadyAcceptedFields = state.accepted ?? {};
  const userDefinedFields = getUserDefinedFields(state);

  return `
Extract planner intake fields.

alreadyAcceptedFields:
${JSON.stringify(alreadyAcceptedFields, null, 2)}

userDefinedFields:
${JSON.stringify(userDefinedFields, null, 2)}

Missing fields before this turn:
${JSON.stringify(missingFields)}

latestUserInput:
${state.input}

Reference date: ${state.referenceDate}
Timezone: ${state.timezone}

Allowed output fields:
- goal
- baseline
- startDate
- relativeStartDate
- dueDate
- relativeDueDate
- daysWeeklyFrequency

Rules (strict):
1. Process fields in this order: goal, baseline, startDate/relativeStartDate, dueDate/relativeDueDate, daysWeeklyFrequency.
2. Never modify alreadyAcceptedFields. Only extract missing fields.
3. If userDefinedFields has a concrete value for a missing field, extract it first.
4. Treat userDefinedFields key as field intent.
5. For date keys: use relativeStartDate/relativeDueDate for relative phrases ("today", "tomorrow", "next week", "in N days", "in N weeks"). Use startDate/dueDate for exact dates like YYYY-MM-DD.
6. If value is vague ("not sure", "maybe", "sometime soon", "sometimes"), skip that field.
7. Never set both startDate and relativeStartDate. Never set both dueDate and relativeDueDate.
8. Return only JSON: { "extracted": { ... } }.

Examples:
- Missing fields: ["startDate", "dueDate"]
- userDefinedFields: { "startDate": "tomorrow", "dueDate": "in 6 weeks" }
- latestUserInput: "tomorrow and in 6 weeks"
- Output: { "extracted": { "relativeStartDate": "tomorrow", "relativeDueDate": "in 6 weeks" } }

- Missing fields: ["baseline"]
- userDefinedFields: { "baseline": "not sure" }
- latestUserInput: "not sure"
- Output: { "extracted": {} }

- Missing fields: ["daysWeeklyFrequency"]
- userDefinedFields: { "daysWeeklyFrequency": "3 days per week" }
- latestUserInput: "3 days"
- Output: { "extracted": { "daysWeeklyFrequency": 3 } }
`;
};

const getMissingFields = (
  accepted: PlanIntakeAcceptedDraft | null,
): PlanIntakeFieldKey[] => {
  const missingFields: PlanIntakeFieldKey[] = [];

  if (!accepted?.goal?.trim()) {
    missingFields.push("goal");
  }

  if (!accepted?.baseline?.trim()) {
    missingFields.push("baseline");
  }

  if (!accepted?.startDate?.trim() && !accepted?.relativeStartDate?.trim()) {
    missingFields.push("startDate");
  }

  if (!accepted?.dueDate?.trim() && !accepted?.relativeDueDate?.trim()) {
    missingFields.push("dueDate");
  }

  if (
    !accepted?.daysWeeklyFrequency ||
    accepted.daysWeeklyFrequency < 1 ||
    accepted.daysWeeklyFrequency > 7
  ) {
    missingFields.push("daysWeeklyFrequency");
  }

  return missingFields;
};

const getQuestionForField = (
  field: PlanIntakeFieldKey,
): PlanPlannerQuestion => {
  switch (field) {
    case "goal":
      return {
        stage: "intake",
        question: {
          field,
          question: "What exactly do you want to achieve?",
        },
        placeholder: "Example: Run a 10k race",
        inputHint: "free_text",
      };
    case "baseline":
      return {
        stage: "intake",
        question: {
          field,
          question: "What is your current starting point?",
        },
        placeholder: "Example: I can currently run 3 km without stopping",
        inputHint: "free_text",
      };
    case "startDate":
      return {
        stage: "intake",
        question: {
          field,
          question:
            'When do you want to start? You can answer with a date or something like "tomorrow".',
        },
        placeholder: "Example: tomorrow",
        inputHint: "date_or_relative",
      };
    case "dueDate":
      return {
        stage: "intake",
        question: {
          field,
          question:
            'When should this be completed? You can answer with a date or something like "in 6 weeks".',
        },
        placeholder: "Example: in 6 weeks",
        inputHint: "date_or_relative",
      };
    case "daysWeeklyFrequency":
      return {
        stage: "intake",
        question: {
          field,
          question: "How many days per week can you work on this?",
        },
        placeholder: "Example: 3 days per week",
        inputHint: "days_per_week",
      };
  }
};

const hasCanonicalFieldValue = (
  draft: PlanIntakeAcceptedDraft,
  field: PlanIntakeFieldKey,
): boolean => {
  if (field === "startDate") {
    return Boolean(draft.startDate?.trim() || draft.relativeStartDate?.trim());
  }

  if (field === "dueDate") {
    return Boolean(draft.dueDate?.trim() || draft.relativeDueDate?.trim());
  }

  const value = draft[field];
  return typeof value === "string"
    ? value.trim().length > 0
    : typeof value === "number";
};

const applyExtractedField = (
  draft: PlanIntakeAcceptedDraft,
  field: keyof PlanIntakeAcceptedDraft,
  value: PlanIntakeAcceptedDraft[keyof PlanIntakeAcceptedDraft],
): void => {
  if (value == null || value === "") {
    return;
  }

  const canonicalField =
    field === "relativeStartDate"
      ? "startDate"
      : field === "relativeDueDate"
        ? "dueDate"
        : (field as PlanIntakeFieldKey);

  if (hasCanonicalFieldValue(draft, canonicalField)) {
    return;
  }

  if (field === "startDate") {
    delete draft.relativeStartDate;
    draft.startDate = value as string;
    return;
  }

  if (field === "relativeStartDate") {
    delete draft.startDate;
    draft.relativeStartDate = value as string;
    return;
  }

  if (field === "dueDate") {
    delete draft.relativeDueDate;
    draft.dueDate = value as string;
    return;
  }

  if (field === "relativeDueDate") {
    delete draft.dueDate;
    draft.relativeDueDate = value as string;
    return;
  }

  if (field === "daysWeeklyFrequency") {
    draft.daysWeeklyFrequency = value as number;
    return;
  }

  draft[field] = value as never;
};

const llmCallPlannerIntake = async (
  state: PlannerIntakeWorkflowState,
  model: BaseChatModel,
): Promise<Partial<PlannerIntakeWorkflowState>> => {
  const structuredModel = model.withStructuredOutput(intakeExtractionSchema);
  const response = await structuredModel.invoke(buildPrompt(state));
  const nextAccepted: PlanIntakeAcceptedDraft = {
    ...(state.accepted ?? {}),
  };
  const extractedEntries = Object.entries(response.extracted) as Array<
    [
      keyof PlanIntakeAcceptedDraft,
      PlanIntakeAcceptedDraft[keyof PlanIntakeAcceptedDraft],
    ]
  >;

  for (const [field, value] of extractedEntries) {
    applyExtractedField(nextAccepted, field, value);
  }

  // TODO(AI Engine): Add error handling and retries for LLM calls.
  const missingFields = getMissingFields(nextAccepted);

  if (missingFields.length > 0) {
    const questions = missingFields.map((missingField) =>
      getQuestionForField(missingField),
    );
    return {
      accepted: nextAccepted,
      waiting: {
        reason: "Missing required planning fields.",
        missingFields,
        questions,
      },
    };
  }

  return {
    accepted: nextAccepted as PlanIntakeAccepted,
    waiting: null,
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
