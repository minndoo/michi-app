import { GoalDetail } from "@/features/goals/GoalDetail";
import { GoalRouteModal } from "@/features/goals/components/GoalRouteModal";

type GoalDetailModalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GoalDetailModalPage({
  params,
}: GoalDetailModalPageProps) {
  const { id } = await params;

  return (
    <GoalRouteModal title="Goal Detail">
      <GoalDetail goalId={id} />
    </GoalRouteModal>
  );
}
