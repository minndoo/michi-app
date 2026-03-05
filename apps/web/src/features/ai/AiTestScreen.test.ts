import { describe, expect, it } from "vitest";
import {
  buildLockedPlannerQuestionAnswers,
  buildPlannerContinuationMessage,
  getPlannerQuestionKey,
  hasAllPlannerAnswersLocked,
  type PlannerQuestion,
} from "./AiTestScreen.helpers";

const questions: PlannerQuestion[] = [
  {
    stage: "intake",
    question: {
      field: "goal",
      question: "What exactly do you want to achieve?",
    },
    placeholder: "Example: Run a 10k race",
    inputHint: "free_text",
  },
  {
    stage: "intake",
    question: {
      field: "daysWeeklyFrequency",
      question: "How many days per week can you work on this?",
    },
    placeholder: "Example: 3 days per week",
    inputHint: "days_per_week",
  },
];

describe("AiTestScreen locked multi-question helpers", () => {
  it("requires all active questions to be locked", () => {
    expect(
      hasAllPlannerAnswersLocked({
        questions,
        lockedAnswersByKey: {
          [getPlannerQuestionKey(questions[0]!)]: "Run a 10k",
        },
      }),
    ).toBe(false);

    expect(
      hasAllPlannerAnswersLocked({
        questions,
        lockedAnswersByKey: {
          [getPlannerQuestionKey(questions[0]!)]: "Run a 10k",
          [getPlannerQuestionKey(questions[1]!)]: "3",
        },
      }),
    ).toBe(true);
  });

  it("builds questionAnswers in displayed question order", () => {
    const questionAnswers = buildLockedPlannerQuestionAnswers({
      questions,
      lockedAnswersByKey: {
        [getPlannerQuestionKey(questions[1]!)]: "3",
        [getPlannerQuestionKey(questions[0]!)]: "Run a 10k",
      },
    });

    expect(questionAnswers).toEqual([
      {
        field: "goal",
        answer: "Run a 10k",
      },
      {
        field: "daysWeeklyFrequency",
        answer: "3",
      },
    ]);
  });

  it("builds deterministic continuation message", () => {
    const message = buildPlannerContinuationMessage([
      {
        field: "goal",
        answer: "Run a 10k",
      },
      {
        field: "daysWeeklyFrequency",
        answer: "3",
      },
    ]);

    expect(message).toBe("goal: Run a 10k\ndaysWeeklyFrequency: 3");
  });
});
