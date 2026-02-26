import { GoalOrder } from "@/lib/api/generated/model";
import { useGetGoals as useGetGoalsBase } from "@/lib/api/generated/goals/goals";

export const useGetGoals = () =>
  useGetGoalsBase({
    order: GoalOrder.Relevant,
  });
