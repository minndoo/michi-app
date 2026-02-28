"use client";

import { useState } from "react";
import { Button, H1, Input, Text, YStack } from "@repo/ui";
import { usePostAgentPlanGoal } from "@/lib/api/generated/agent/agent";
import type {
  AgentPlanGoalInput,
  AgentPlanGoalResponse,
} from "@/lib/api/generated/model";

export const AiTestScreen = () => {
  const [goal, setGoal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startingPoint, setStartingPoint] = useState("");
  const [result, setResult] = useState<AgentPlanGoalResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = usePostAgentPlanGoal({
    mutation: {
      onSuccess: (response) => {
        setResult(response.data);
        setErrorMessage(null);
      },
      onError: (error) => {
        setResult(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Request failed",
        );
      },
    },
  });

  const handleSubmit = () => {
    const trimmedGoal = goal.trim();
    const trimmedDueDate = dueDate.trim();
    const trimmedStartingPoint = startingPoint.trim();

    if (!trimmedGoal || !trimmedDueDate || !trimmedStartingPoint) {
      return;
    }

    const parsedDueDate = new Date(trimmedDueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      setErrorMessage("Due date must be a valid date.");
      setResult(null);
      return;
    }

    const payload: AgentPlanGoalInput = {
      goal: trimmedGoal,
      dueDate: parsedDueDate.toISOString(),
      startingPoint: trimmedStartingPoint,
    };

    mutation.mutate({ data: payload });
  };

  return (
    <YStack gap="$4" width="100%" maxW="$screen.md" py="$4">
      <H1 color="$color8">AI Test</H1>
      <Input placeholder="Goal" value={goal} onChangeText={setGoal} />
      <Input
        placeholder="Due date (YYYY-MM-DD)"
        value={dueDate}
        onChangeText={setDueDate}
      />
      <Input
        placeholder="Starting point"
        value={startingPoint}
        onChangeText={setStartingPoint}
      />
      <Button onPress={handleSubmit} disabled={mutation.isPending}>
        <Text color="inherit">
          {mutation.isPending ? "Sending..." : "Submit"}
        </Text>
      </Button>

      {errorMessage ? <Text color="$red10">{errorMessage}</Text> : null}

      {result ? (
        <YStack gap="$2" p="$3" rounded="$3" bg="$backgroundPress">
          <Text color="$color11">Intent: {result.routedIntent}</Text>
          {result.plannerAction ? (
            <Text color="$color11">Planner action: {result.plannerAction}</Text>
          ) : null}
          <Text color="$color12">Response: {result.response}</Text>
          {result.plan ? (
            <YStack gap="$2" pt="$2">
              <Text color="$color12">Goal: {result.plan.goal.title}</Text>
              {result.plan.goal.description ? (
                <Text color="$color11">
                  Goal description: {result.plan.goal.description}
                </Text>
              ) : null}
              {result.plan.goal.dueAt ? (
                <Text color="$color11">Goal due: {result.plan.goal.dueAt}</Text>
              ) : null}
              <YStack gap="$1">
                {result.plan.tasks.map((task, index) => (
                  <YStack key={`${task.title}-${index}`} gap="$1">
                    <Text color="$color12">
                      Task {index + 1}: {task.title}
                    </Text>
                    {task.description ? (
                      <Text color="$color11">{task.description}</Text>
                    ) : null}
                    {task.dueAt ? (
                      <Text color="$color11">Due: {task.dueAt}</Text>
                    ) : null}
                  </YStack>
                ))}
              </YStack>
            </YStack>
          ) : null}
        </YStack>
      ) : null}
    </YStack>
  );
};
