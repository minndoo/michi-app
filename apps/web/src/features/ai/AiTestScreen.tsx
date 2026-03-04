"use client";

import React, { useState } from "react";
import { Button, H1, Text, TextArea, XStack, YStack } from "@repo/ui";
import type {
  AgentMessageInput,
  AgentMessageResponse,
} from "@/lib/api/generated/model";
import {
  enqueueAgentRun,
  getAgentRunStatus,
  isWaitingPlannerResponse,
  streamAgentRun,
  type AgentStreamEvent,
  type AgentStreamJobType,
} from "./agentStream";

const fallbackTimezone = "UTC";

type AiTestResult = AgentMessageResponse;
type PlannerQuestion = NonNullable<AgentMessageResponse["plannerQuestion"]>;
type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  kind: "text" | "status" | "result" | "error";
  text: string;
  response?: AgentMessageResponse;
};

const getTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || fallbackTimezone;

const createMessageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createThreadId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `ai-test-thread-${crypto.randomUUID()}`
    : `ai-test-thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createStreamText = (event: AgentStreamEvent): string | null => {
  if (event.type === "run_started") {
    return "Run started.";
  }

  if (event.type === "router_started") {
    return "Routing request...";
  }

  if (event.type === "router_intent_resolved") {
    return `Intent routed: ${event.routedIntent}`;
  }

  if (event.type === "planner_started") {
    return "Planning...";
  }

  if (event.type === "planner_stage") {
    if (event.stage === "intake") {
      return "Processing input...";
    }

    if (event.stage === "preparation") {
      return "Preparing plan...";
    }

    return "Generating plan...";
  }

  if (event.type === "planner_waiting") {
    return event.question.question.question;
  }

  if (event.type === "planner_completed") {
    return event.plannerAction
      ? `Planning complete: ${event.plannerAction}`
      : "Planning complete.";
  }

  if (event.type === "done") {
    return null;
  }

  return null;
};

export const AiTestScreen = () => {
  const [threadId, setThreadId] = useState(createThreadId);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingMode, setPendingMode] = useState<AgentStreamJobType>("message");
  const [lastResult, setLastResult] = useState<AiTestResult | null>(null);
  const [_activeJobId, setActiveJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePlannerQuestion, setActivePlannerQuestion] =
    useState<PlannerQuestion | null>(null);

  const handleStreamEvent = (event: AgentStreamEvent) => {
    if (
      event.type === "run_started" ||
      event.type === "router_started" ||
      event.type === "router_intent_resolved" ||
      event.type === "planner_started" ||
      event.type === "planner_stage" ||
      event.type === "planner_waiting" ||
      event.type === "planner_completed"
    ) {
      const text = createStreamText(event);

      if (event.type === "planner_waiting") {
        setActivePlannerQuestion(event.question);
      }

      if (!text) {
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "system",
          kind: "status",
          text,
        },
      ]);
      return;
    }

    if (event.type === "result") {
      setLastResult(event.response);
      const nextQuestion = event.response.plannerQuestion ?? null;
      setActivePlannerQuestion(nextQuestion);
      setPendingMode(nextQuestion ? "plan_goal" : "message");
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          kind: "result",
          text: event.response.response,
          response: event.response,
        },
      ]);
      setErrorMessage(null);
      return;
    }

    if (event.type === "error") {
      setErrorMessage(event.message);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          kind: "error",
          text: event.message,
        },
      ]);
    }
  };

  const handleMessageSubmit = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isStreaming) {
      return;
    }

    const nextThreadId =
      pendingMode === "message" ? createThreadId() : threadId;

    const payload: AgentMessageInput = {
      threadId: nextThreadId,
      message: trimmedMessage,
      timezone: getTimezone(),
      ...(activePlannerQuestion
        ? {
            questionAnswer: {
              field: activePlannerQuestion.question.field,
              answer: trimmedMessage,
            },
          }
        : {}),
    };

    setMessage("");
    setErrorMessage(null);
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: "user",
        kind: "text",
        text: trimmedMessage,
      },
    ]);
    setIsStreaming(true);
    let queuedJobId: string | null = null;

    try {
      if (pendingMode === "message") {
        setThreadId(nextThreadId);
      }

      const enqueueResponse = await enqueueAgentRun({
        input: payload,
        jobType: pendingMode,
      });
      const nextJobId = enqueueResponse.jobId;
      queuedJobId = nextJobId;

      setActiveJobId(nextJobId);

      await streamAgentRun({
        jobId: nextJobId,
        jobType: pendingMode,
        onEvent: handleStreamEvent,
      });
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Request failed";

      if (queuedJobId) {
        try {
          const fallbackStatus = await getAgentRunStatus({
            jobId: queuedJobId,
            jobType: pendingMode,
          });

          if (fallbackStatus.result) {
            handleStreamEvent({
              type: "result",
              jobId: fallbackStatus.jobId,
              jobType: pendingMode,
              response: fallbackStatus.result,
            });
          }
        } catch {
          // Keep the original stream error message when recovery also fails.
        }
      }

      setPendingMode("message");
      setLastResult(null);
      setActivePlannerQuestion(null);
      setThreadId(createThreadId());
      setErrorMessage(nextMessage);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          kind: "error",
          text: nextMessage,
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <YStack gap="$4" width="100%" maxW="$screen.md" py="$4">
      <H1 color="$color8">AI Test</H1>
      <YStack
        gap="$3"
        p="$3"
        rounded="$4"
        borderWidth={1}
        borderColor="$borderColor"
        bg="$backgroundPress"
      >
        <Text color="$color11">Single thread chat</Text>
        <YStack gap="$2" minH={240}>
          {messages.length === 0 ? (
            <Text color="$color10">
              Start with a planning prompt. Follow-up messages continue the same
              thread automatically when the planner is waiting.
            </Text>
          ) : (
            messages.map((entry) => {
              const plan = entry.response?.plan;
              const refusal = entry.response?.refusal;
              const isUser = entry.role === "user";

              return (
                <YStack
                  key={entry.id}
                  gap="$2"
                  p="$3"
                  rounded="$3"
                  bg={
                    entry.kind === "status"
                      ? "$background"
                      : isUser
                        ? "$color4"
                        : entry.kind === "error"
                          ? "$red3"
                          : "$color2"
                  }
                >
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text color="$color10">
                      {isUser
                        ? "You"
                        : entry.kind === "status"
                          ? "Status"
                          : "Assistant"}
                    </Text>
                    {entry.kind === "result" && entry.response ? (
                      <Text color="$color10">
                        {isWaitingPlannerResponse(entry.response)
                          ? "Awaiting follow-up"
                          : "Final response"}
                      </Text>
                    ) : null}
                  </XStack>
                  <Text color={entry.kind === "error" ? "$red10" : "$color12"}>
                    {entry.text}
                  </Text>
                  {refusal ? (
                    <YStack gap="$1" pt="$2">
                      <Text color="$color12">
                        Refusal reason: {refusal.reason}
                      </Text>
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
                        <Text color="$color11">
                          Goal due: {plan.goal.dueAt}
                        </Text>
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
              );
            })
          )}
        </YStack>
        {lastResult ? (
          <Text color="$color10">
            Next send mode:{" "}
            {pendingMode === "plan_goal" ? "continue plan" : "new message"}
          </Text>
        ) : null}
        {activePlannerQuestion ? (
          <YStack
            gap="$2"
            p="$3"
            rounded="$3"
            borderWidth={1}
            borderColor="$borderColor"
            bg="$background"
          >
            <Text color="$color10">
              {activePlannerQuestion.stage === "intake"
                ? "Missing detail"
                : "Clarification"}
            </Text>
            <Text color="$color12">
              {activePlannerQuestion.question.question}
            </Text>
          </YStack>
        ) : null}
        <TextArea
          placeholder={
            activePlannerQuestion?.placeholder ??
            "Describe what you want help planning"
          }
          value={message}
          onChangeText={setMessage}
          height={120}
        />
        <Button onPress={handleMessageSubmit} disabled={isStreaming}>
          <Text color="inherit">
            {isStreaming
              ? "Streaming..."
              : activePlannerQuestion
                ? "Answer question"
                : "Send message"}
          </Text>
        </Button>
      </YStack>

      {errorMessage ? <Text color="$red10">{errorMessage}</Text> : null}
    </YStack>
  );
};
