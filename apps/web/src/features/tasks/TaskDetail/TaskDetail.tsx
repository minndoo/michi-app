"use client";

import { useRouter } from "next/navigation";
import { Button, Text, View, YStack } from "@repo/ui";

export type TaskDetailProps = {
  taskId: string;
};

export const TaskDetail = ({ taskId }: TaskDetailProps) => {
  const router = useRouter();

  // TODO: fetch data from getTask
  return (
    <YStack gap="$4">
      <View
        bg="$backgroundSoft"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        p="$4"
      >
        <Text color="$outlineColor">TaskDetail</Text>
        <Text color="$colorMuted">Task ID: {taskId}</Text>
      </View>

      {/* TODO: Use LinkButton */}
      <Button
        variant="outlined"
        onPress={() => router.push(`/tasks/${taskId}/edit`)}
      >
        <Text color="$outlineColor">Edit Task</Text>
      </Button>
    </YStack>
  );
};
