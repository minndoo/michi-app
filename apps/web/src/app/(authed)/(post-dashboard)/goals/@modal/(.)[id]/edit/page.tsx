import { EditGoalForm } from "@/features/goals/GoalForm";
import { GoalRouteModal } from "@/features/goals/components/GoalRouteModal";

type GoalEditModalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GoalEditModalPage({
  params,
}: GoalEditModalPageProps) {
  const { id } = await params;

  return (
    <GoalRouteModal title="Edit Goal">
      <EditGoalForm goalId={id} />
    </GoalRouteModal>
  );
}
