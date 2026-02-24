import { GoalDetail } from "@/features/goals/GoalDetail";

type GoalDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { id } = await params;

  return <GoalDetail goalId={id} />;
}
