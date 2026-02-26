import { CreateGoalForm } from "@/features/goals/GoalForm";
import { GoalRouteModal } from "@/features/goals/components/GoalRouteModal";

export default function GoalCreateModalPage() {
  return (
    <GoalRouteModal title="Create Goal">
      <CreateGoalForm />
    </GoalRouteModal>
  );
}
