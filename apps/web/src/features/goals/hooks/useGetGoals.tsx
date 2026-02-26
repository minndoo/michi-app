import type { GetGoalsParams, GoalStatus } from "@/lib/api/generated/model";
import { useGetGoals as useGetGoalsBase } from "@/lib/api/generated/goals/goals";

export const useGetGoals = (
  status?: GoalStatus,
  order?: GetGoalsParams["order"],
) =>
  useGetGoalsBase({
    status,
    order,
  });
