import { TaskForm } from "@/features/tasks/TaskForm";
import { TaskRouteModal } from "@/features/tasks/components/TaskRouteModal";

export default function TaskCreateModalPage() {
  return (
    <TaskRouteModal title="Create Task">
      <TaskForm mode="create" />
    </TaskRouteModal>
  );
}
