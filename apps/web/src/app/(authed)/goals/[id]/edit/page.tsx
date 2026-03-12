import { EditGoalForm } from "@/features/goals/GoalForm";

type GoalEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GoalEditPage({ params }: GoalEditPageProps) {
  const { id } = await params;

  return <EditGoalForm goalId={id} />;
}
