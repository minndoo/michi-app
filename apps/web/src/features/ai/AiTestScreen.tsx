"use client";

import { useState } from "react";
import { Button, H1, Text, TextArea, YStack } from "@repo/ui";
import { usePostAgentMessage } from "@/lib/api/generated/agent/agent";
import type {
  AgentMessageInput,
  AgentMessageResponse,
} from "@/lib/api/generated/model";

const fallbackTimezone = "UTC";
const aiTestThreadId = "ai-test-thread";

type AiTestResult = AgentMessageResponse;

const getTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || fallbackTimezone;

export const AiTestScreen = () => {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<AiTestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const plan = result?.plan;
  const refusal = result?.refusal;

  const messageMutation = usePostAgentMessage({
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

  const handleMessageSubmit = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    const payload: AgentMessageInput = {
      threadId: aiTestThreadId,
      message: trimmedMessage,
      timezone: getTimezone(),
    };

    messageMutation.mutate({ data: payload });
  };

  return (
    <YStack gap="$4" width="100%" maxW="$screen.md" py="$4">
      <H1 color="$color8">AI Test</H1>
      <YStack gap="$3">
        <Text color="$color11">Plain input</Text>
        <TextArea
          placeholder="Describe what you want help planning"
          value={message}
          onChangeText={setMessage}
          height={120}
        />
        <Button
          onPress={handleMessageSubmit}
          disabled={messageMutation.isPending}
        >
          <Text color="inherit">
            {messageMutation.isPending ? "Sending..." : "Submit plain input"}
          </Text>
        </Button>
      </YStack>

      {errorMessage ? <Text color="$red10">{errorMessage}</Text> : null}

      {result ? (
        <YStack gap="$2" p="$3" rounded="$3" bg="$backgroundPress">
          <Text color="$color11">Intent: {result.routedIntent}</Text>
          {result.plannerAction ? (
            <Text color="$color11">Planner action: {result.plannerAction}</Text>
          ) : null}
          <Text color="$color12">Response: {result.response}</Text>
          {refusal ? (
            <YStack gap="$1" pt="$2">
              <Text color="$color12">Refusal reason: {refusal.reason}</Text>
              {refusal.proposals.map((proposal, index) => (
                <Text key={`${proposal}-${index}`} color="$color11">
                  Proposal {index + 1}: {proposal}
                </Text>
              ))}
            </YStack>
          ) : null}
          {plan ? (
            <YStack gap="$2" pt="$2">
              <Text color="$color12">Goal: {plan.goal.title}</Text>
              {plan.goal.description ? (
                <Text color="$color11">
                  Goal description: {plan.goal.description}
                </Text>
              ) : null}
              {plan.goal.dueAt ? (
                <Text color="$color11">Goal due: {plan.goal.dueAt}</Text>
              ) : null}
              <YStack gap="$1">
                {plan.tasks?.map((task, index) => (
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
