export const routedIntentValues = [
  "plan_goal",
  "show_tasks",
  "show_goals",
  "show_tasks_today",
  "refuse",
] as const;

export type RoutedIntent = (typeof routedIntentValues)[number];

export const plannerActionValues = ["create_plan", "refuse_plan"] as const;

export type PlannerAction = (typeof plannerActionValues)[number];

export interface AgentMessageInput {
  threadId: string;
  message: string;
}

export interface AgentMessageResponse {
  threadId: string;
  routedIntent: RoutedIntent;
  response: string;
  plannerAction?: PlannerAction;
}

export interface AgentEngineInput extends AgentMessageInput {
  userId: string;
}

export interface AgentEngineResult {
  routedIntent: RoutedIntent;
  response: string;
  plannerAction?: PlannerAction;
}
