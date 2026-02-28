"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, H1, Input, Text, YStack } from "@repo/ui";
import { apiClient } from "@/lib/api/mutator";

type AgentMessageResponse = {
  threadId: string;
  routedIntent:
    | "plan_goal"
    | "show_tasks"
    | "show_goals"
    | "show_tasks_today"
    | "refuse";
  response: string;
  plannerAction?: "create_plan" | "refuse_plan";
};

type AiTestScreenProps = {
  auth0Id: string;
};

export const AiTestScreen = ({ auth0Id }: AiTestScreenProps) => {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<AgentMessageResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (input: string) => {
      const response = await apiClient<{ data: AgentMessageResponse }>(
        "/agent/message",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            threadId: `${auth0Id}-1`,
            message: input,
          }),
        },
      );

      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setErrorMessage(null);
    },
    onError: (error) => {
      setResult(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Request failed",
      );
    },
  });

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    mutation.mutate(trimmedMessage);
  };

  return (
    <YStack gap="$4" width="100%" maxW="$screen.md" py="$4">
      <H1 color="$color8">AI Test</H1>
      <Input
        placeholder="Type a message"
        value={message}
        onChangeText={setMessage}
      />
      <Button onPress={handleSubmit} disabled={mutation.isPending}>
        <Text color="inherit">
          {mutation.isPending ? "Sending..." : "Submit"}
        </Text>
      </Button>

      {errorMessage ? <Text color="$red10">{errorMessage}</Text> : null}

      {result ? (
        <YStack gap="$2" p="$3" rounded="$3" bg="$backgroundPress">
          <Text color="$color11">Thread: {result.threadId}</Text>
          <Text color="$color11">Intent: {result.routedIntent}</Text>
          {result.plannerAction ? (
            <Text color="$color11">Planner action: {result.plannerAction}</Text>
          ) : null}
          <Text color="$color12">Response: {result.response}</Text>
        </YStack>
      ) : null}
    </YStack>
  );
};
