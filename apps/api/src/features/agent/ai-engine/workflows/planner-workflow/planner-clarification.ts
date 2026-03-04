import type { PlannerQuestionClarification } from "../../../agent.types.js";

export const createClarification = (
  clarification: PlannerQuestionClarification,
): string => `${clarification.field}: ${clarification.answer}`;
