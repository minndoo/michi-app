import type { AgentJobType } from "./agent.types.js";

export const agentQueueName = "agent";

export interface AgentJobPayload {
  userId: string;
  threadId: string;
  timezone: string;
  message: string;
}

export const agentJobRouteSegments: Record<AgentJobType, string> = {
  message: "message",
  plan_goal: "plan-goal",
};

export const getRouteSegmentForAgentJobType = (jobType: AgentJobType): string =>
  agentJobRouteSegments[jobType];

export const getAgentJobTypeFromRouteSegment = (
  routeSegment: string,
): AgentJobType | null => {
  if (routeSegment === agentJobRouteSegments.message) {
    return "message";
  }

  if (routeSegment === agentJobRouteSegments.plan_goal) {
    return "plan_goal";
  }

  return null;
};
