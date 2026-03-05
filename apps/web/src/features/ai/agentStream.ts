import type { AgentMessageResponse } from "@/lib/api/generated/model";
import type { AgentMessageInput } from "@/lib/api/generated/model";

export type AgentStreamEvent =
  | {
      type: "run_started";
      jobId: string;
      jobType: AgentStreamJobType;
      threadId: string;
    }
  | {
      type: "router_started";
      jobId: string;
      jobType: AgentStreamJobType;
      threadId: string;
    }
  | {
      type: "router_intent_resolved";
      jobId: string;
      jobType: AgentStreamJobType;
      threadId: string;
      routedIntent: AgentMessageResponse["routedIntent"];
    }
  | {
      type: "planner_started";
      jobId: string;
      jobType: AgentStreamJobType;
      threadId: string;
    }
  | {
      type: "planner_stage";
      jobId: string;
      jobType: AgentStreamJobType;
      threadId: string;
      stage: "intake" | "preparation" | "generation";
      payload: Record<string, unknown>;
    }
  | {
      type: "planner_waiting";
      jobId: string;
      jobType: AgentStreamJobType;
      threadId: string;
      stage: NonNullable<
        AgentMessageResponse["plannerQuestions"]
      >[number]["stage"];
      questions: NonNullable<AgentMessageResponse["plannerQuestions"]>;
    }
  | {
      type: "planner_completed";
      jobId: string;
      jobType: AgentStreamJobType;
      threadId: string;
      plannerAction?: AgentMessageResponse["plannerAction"];
    }
  | {
      type: "result";
      jobId: string;
      jobType: AgentStreamJobType;
      response: AgentMessageResponse;
    }
  | {
      type: "error";
      jobId: string;
      jobType: AgentStreamJobType;
      threadId: string;
      message: string;
    }
  | {
      type: "done";
      jobId: string;
      jobType: AgentStreamJobType;
      threadId: string;
    };

export type AgentStreamJobType = "message" | "plan_goal";

export type AgentEnqueueResponse = {
  threadId: string;
  jobId: string;
};

export type AgentJobStateResponse = {
  jobId: string;
  threadId: string;
  status: "queued" | "active" | "completed" | "failed";
  result?: AgentMessageResponse;
  error?: string;
};

const getAgentRouteSegment = (jobType: AgentStreamJobType): string =>
  jobType === "message" ? "message" : "plan-goal";

const parseErrorResponse = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? `Request failed with status ${response.status}`;
  }

  const text = await response.text();
  return text || `Request failed with status ${response.status}`;
};

const parseEventChunk = (chunk: string): AgentStreamEvent[] => {
  const blocks = chunk.split("\n\n");
  const completeBlocks = blocks.slice(0, -1);
  const events: AgentStreamEvent[] = [];

  for (const block of completeBlocks) {
    const lines = block.split("\n");
    const eventLine = lines.find((line) => line.startsWith("event: "));
    const dataLine = lines.find((line) => line.startsWith("data: "));

    if (!eventLine || !dataLine) {
      continue;
    }

    const payload = JSON.parse(
      dataLine.slice("data: ".length),
    ) as AgentStreamEvent;
    events.push(payload);
  }

  return events;
};

export const isWaitingPlannerResponse = (
  result: AgentMessageResponse | null,
): boolean =>
  result != null &&
  result.routedIntent === "plan_goal" &&
  ((result.plannerQuestions?.length ?? 0) > 0 ||
    (result.plannerAction == null &&
      result.plan == null &&
      result.refusal == null));

export const enqueueAgentRun = async ({
  input,
  jobType,
}: {
  input: AgentMessageInput;
  jobType: AgentStreamJobType;
}): Promise<AgentEnqueueResponse> => {
  const response = await fetch(
    `/api/bff/agent/${getAgentRouteSegment(jobType)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return (await response.json()) as AgentEnqueueResponse;
};

export const getAgentRunStatus = async ({
  jobId,
  jobType,
}: {
  jobId: string;
  jobType: AgentStreamJobType;
}): Promise<AgentJobStateResponse> => {
  const response = await fetch(
    `/api/bff/agent/${getAgentRouteSegment(jobType)}/${jobId}`,
  );

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return (await response.json()) as AgentJobStateResponse;
};

export const streamAgentRun = async ({
  jobId,
  jobType,
  onEvent,
}: {
  jobId: string;
  jobType: AgentStreamJobType;
  onEvent: (event: AgentStreamEvent) => void;
}): Promise<void> => {
  const response = await fetch(
    `/api/bff/agent/${getAgentRouteSegment(jobType)}/${jobId}/stream`,
    {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
      },
    },
  );

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  if (!response.body) {
    throw new Error("Stream response body is missing");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const events = parseEventChunk(`${block}\n\n`);
      for (const event of events) {
        onEvent(event);
      }
    }
  }

  if (buffer.trim()) {
    for (const event of parseEventChunk(`${buffer}\n\n`)) {
      onEvent(event);
    }
  }
};
