import type {
  AgentMessageInput,
  AgentMessageResponse,
} from "@/lib/api/generated/model";

export type PlannerQuestion = NonNullable<
  AgentMessageResponse["plannerQuestions"]
>[number];

type PlannerQuestionAnswer = NonNullable<
  AgentMessageInput["questionAnswers"]
>[number];

export const getPlannerQuestionKey = (question: PlannerQuestion): string =>
  `${question.stage}:${question.question.field}`;

export const hasAllPlannerAnswersLocked = ({
  lockedAnswersByKey,
  questions,
}: {
  lockedAnswersByKey: Record<string, string>;
  questions: PlannerQuestion[];
}): boolean =>
  questions.length > 0 &&
  questions.every((question) => {
    const key = getPlannerQuestionKey(question);
    return (lockedAnswersByKey[key] ?? "").trim().length > 0;
  });

export const buildLockedPlannerQuestionAnswers = ({
  lockedAnswersByKey,
  questions,
}: {
  lockedAnswersByKey: Record<string, string>;
  questions: PlannerQuestion[];
}): PlannerQuestionAnswer[] =>
  questions.map((question) => {
    const key = getPlannerQuestionKey(question);

    return {
      field: question.question.field,
      answer: lockedAnswersByKey[key]!,
    };
  });

export const buildPlannerContinuationMessage = (
  answers: PlannerQuestionAnswer[],
): string =>
  answers.map((answer) => `${answer.field}: ${answer.answer}`).join("\n");
