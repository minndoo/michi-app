import type { PlannerQuestionClarification } from "../../../agent.types.js";

export const createClarification = (
  clarifications: PlannerQuestionClarification[],
): string =>
  clarifications
    .map((clarification) => `${clarification.field}: ${clarification.answer}`)
    .join("\n");
