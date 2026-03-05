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
You are extracting planner intake fields from a planning conversation.

This turn is one of two modes:
1. an initial planning request containing multiple fields
2. follow-up answers to one or more planner questions about missing fields

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

Allowed fields only:
- goal
- baseline
- startDate
- relativeStartDate
- dueDate
- relativeDueDate
- daysWeeklyFrequency

How to use context:
- alreadyAcceptedFields are context only.
- Never modify, restate, correct, or reinterpret alreadyAcceptedFields.
- Missing fields are extraction priority only. They are not proof that the latest user input answers them.
- userDefinedFields are user-provided field answers and part of the same message context as latestUserInput.
- Use both latestUserInput and userDefinedFields as extraction sources for this turn.

Decision rules and precedence:
1. Extract zero to many fields independently in one turn.
2. For each field independently, extract only when value is clearly answered by latestUserInput and/or userDefinedFields.
3. If a field is unclear or ambiguous, omit that field only; keep any other clear field extractions.
4. Never overwrite alreadyAcceptedFields.
5. Both exact calendar dates and relative date phrases are valid date answers.
6. Relative phrases like "today", "tomorrow", "next week", "in 6 weeks", and "in 10 days" may map to relativeStartDate/relativeDueDate.
7. Explicit calendar dates like "2026-03-12" or "2026-04-20" may map to startDate/dueDate.

Short-answer rules:
- Short fragment answers are expected in follow-up turns.
- Examples of short fragments: "run 1km", "tomorrow", "in 6 weeks", "3 days".
- If userDefinedFields.baseline is "run 1km", interpret it as baseline if that is a reasonable fit.
- If userDefinedFields.startDate is "tomorrow", extract relativeStartDate.
- If userDefinedFields.dueDate is "in 6 weeks", extract relativeDueDate.
- If userDefinedFields.daysWeeklyFrequency is "3 days", extract daysWeeklyFrequency = 3.
- If a short fragment could fit multiple supported fields and no field-targeting signal exists, omit that ambiguous field.

Do not extract:
- If latestUserInput and userDefinedFields are both ambiguous, vague, unrelated, or unsupported, return extracted: {}.
- If you do not clearly understand a value, do not extract it.
- Do not guess baseline, cadence, or dates.
- Do not convert vague phrasing into numeric cadence unless it is directly supported.
- Do not normalize dates.
- Do not evaluate feasibility.
- Do not derive preparedness values.
- Do not ask preparation-style clarifications.
- If a date phrase is vague (for example "sometime soon"), omit that date field instead of guessing.
- Never set both startDate and relativeStartDate.
- Never set both dueDate and relativeDueDate.

Negative examples:
- Missing fields: ["goal", "baseline"]
- userDefinedFields: {}
- latestUserInput: "run 1km"
- Output: { "extracted": {} }

- Missing fields: ["baseline"]
- userDefinedFields: { "baseline": "not sure" }
- latestUserInput: "not sure"
- Output: { "extracted": {} }

- Missing fields: ["daysWeeklyFrequency"]
- userDefinedFields: { "daysWeeklyFrequency": "sometimes" }
- latestUserInput: "sometimes"
- Output: { "extracted": {} }

- Missing fields: ["startDate"]
- userDefinedFields: { "startDate": "sometime soon" }
- latestUserInput: "sometime soon"
- Output: { "extracted": {} }

Positive examples:
- alreadyAcceptedFields: { "goal": "Run a 10k" }
- Missing fields: ["baseline"]
- userDefinedFields: { "baseline": "run 1km" }
- latestUserInput: "run 1km"
- Output: { "extracted": { "baseline": "run 1km" } }

- userDefinedFields: { "startDate": "tomorrow" }
- latestUserInput: "tomorrow"
- Output: { "extracted": { "relativeStartDate": "tomorrow" } }

- userDefinedFields: { "dueDate": "in 6 weeks" }
- latestUserInput: "in 6 weeks"
- Output: { "extracted": { "relativeDueDate": "in 6 weeks" } }

- userDefinedFields: { "startDate": "next week" }
- latestUserInput: "next week"
- Output: { "extracted": { "relativeStartDate": "next week" } }

- userDefinedFields: { "startDate": "2026-03-12" }
- latestUserInput: "2026-03-12"
- Output: { "extracted": { "startDate": "2026-03-12" } }

- userDefinedFields: { "dueDate": "2026-04-20" }
- latestUserInput: "2026-04-20"
- Output: { "extracted": { "dueDate": "2026-04-20" } }

- userDefinedFields: { "daysWeeklyFrequency": "3 days" }
- latestUserInput: "3 days"
- Output: { "extracted": { "daysWeeklyFrequency": 3 } }

- Missing fields: ["baseline", "daysWeeklyFrequency"]
- userDefinedFields: { "baseline": "can run 3km", "daysWeeklyFrequency": "3 days per week" }
- latestUserInput: "I can run 3km and train 3 days weekly"
- Output: { "extracted": { "baseline": "can run 3km", "daysWeeklyFrequency": 3 } }

Return JSON with:
- extracted: object containing only supported fields clearly answered by latestUserInput and/or userDefinedFields
- If no supported field is clearly answered, return extracted: {}
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
