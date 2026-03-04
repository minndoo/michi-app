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
import { createClarification } from "../planner-clarification.js";

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
  questionAnswer: Annotation<PlanningSharedState["questionAnswer"]>({
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

const buildPrompt = (state: PlannerIntakeWorkflowState): string => {
  const missingFields = getMissingFields(state.accepted ?? null);
  const clarification = state.questionAnswer
    ? createClarification(state.questionAnswer)
    : "none";

  return `
You are extracting planner intake fields from a planning conversation.

This turn is one of two modes:
1. an initial planning request containing multiple fields
2. a follow-up answer to one planner question about one missing field

Already accepted fields:
${JSON.stringify(state.accepted ?? {}, null, 2)}

Missing fields before this turn:
${JSON.stringify(missingFields)}

Clarifications:
${clarification}

Latest user input:
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
- Already accepted fields are context only.
- Never modify, restate, correct, or reinterpret already accepted fields.
- Missing fields are extraction priority only. They are not proof that the latest user input answers them.
- Clarifications are the strongest hint for what field the user is answering, especially for short answers.
- The latest user input is the only source of extracted values.

Decision rules and precedence:
1. If Clarifications is not "none", first check whether the latest user input clearly answers that clarified field.
2. If it clearly answers that clarified field, extract only that supported field or its supported date variant.
3. If it does not clearly answer that clarified field, do not force extraction.
4. If there is no clarification, consider whether the latest user input clearly answers one currently missing field.
5. If the latest user input could reasonably fit multiple supported fields, extract nothing.
6. Never overwrite already accepted fields.

Short-answer rules:
- Short fragment answers are expected in follow-up turns.
- Examples of short fragments: "run 1km", "tomorrow", "in 6 weeks", "3 days".
- If Clarifications says baseline and the user says "run 1km", interpret it as baseline if that is a reasonable fit.
- If Clarifications says startDate and the user says "tomorrow", extract relativeStartDate.
- If Clarifications says dueDate and the user says "tomorrow", extract relativeDueDate.
- If Clarifications says daysWeeklyFrequency and the user says "3 days", extract daysWeeklyFrequency = 3.
- If no clarification exists and a short fragment could fit multiple supported fields, extract nothing.

Do not extract:
- If the latest user input is ambiguous, vague, unrelated, or unsupported, return extracted: {}.
- If you do not clearly understand a value, do not extract it.
- Do not guess baseline, cadence, or dates.
- Do not convert vague phrasing into numeric cadence unless it is directly supported.
- Do not normalize dates.
- Do not evaluate feasibility.
- Do not derive preparedness values.
- Do not ask preparation-style clarifications.
- Never set both startDate and relativeStartDate.
- Never set both dueDate and relativeDueDate.

Negative examples:
- Missing fields: ["goal", "baseline"]
- Clarifications: none
- Latest user input: "run 1km"
- Output: { "extracted": {} }

- Missing fields: ["baseline"]
- Clarifications:
baseline: not sure
- Latest user input: "not sure"
- Output: { "extracted": {} }

- Missing fields: ["daysWeeklyFrequency"]
- Clarifications:
daysWeeklyFrequency: sometimes
- Latest user input: "sometimes"
- Output: { "extracted": {} }

Positive examples:
- Already accepted fields: { "goal": "Run a 10k" }
- Missing fields: ["baseline"]
- Clarifications:
baseline: run 1km
- Latest user input: "run 1km"
- Output: { "extracted": { "baseline": "run 1km" } }

- Clarifications:
startDate: tomorrow
- Latest user input: "tomorrow"
- Output: { "extracted": { "relativeStartDate": "tomorrow" } }

- Clarifications:
dueDate: in 6 weeks
- Latest user input: "in 6 weeks"
- Output: { "extracted": { "relativeDueDate": "in 6 weeks" } }

- Clarifications:
daysWeeklyFrequency: 3 days
- Latest user input: "3 days"
- Output: { "extracted": { "daysWeeklyFrequency": 3 } }

Return JSON with:
- extracted: object containing only supported fields that the latest user input clearly answers, using Clarifications and Missing fields only to determine which field the answer is about
- If the latest user input does not clearly answer a single supported field, return extracted: {}
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
    const question = getQuestionForField(missingFields[0]!);
    return {
      accepted: nextAccepted,
      waiting: {
        reason: "Missing required planning fields.",
        missingFields,
        question,
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
