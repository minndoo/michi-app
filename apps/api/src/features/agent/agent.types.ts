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

export interface AgentRefusal {
  reason: string;
  proposals: string[];
}

export interface AgentInput {
  threadId?: string | null;
  timezone: string;
}

export const plannerFieldKeyValues = [
  "goal",
  "baseline",
  "startDate",
  "dueDate",
  "daysWeeklyFrequency",
] as const;

export type PlannerFieldKey = (typeof plannerFieldKeyValues)[number];

export interface PlannerQuestionClarification {
  field: PlannerFieldKey;
  answer: string;
}

export interface AgentMessageInput extends AgentInput {
  threadId: string;
  message: string;
  questionAnswer?: PlannerQuestionClarification | null;
}

export interface AgentPlannedGoal {
  title: string;
  description?: string | null;
  dueAt?: string | null;
}

export interface AgentPlannedTask {
  title: string;
  description?: string | null;
  dueAt?: string | null;
}

export interface AgentPlannedGoalWithTasks {
  goal: AgentPlannedGoal;
  tasks: AgentPlannedTask[];
}

export interface AgentMessageResponse {
  threadId: string;
  routedIntent: RoutedIntent;
  response: string;
  plannerAction?: PlannerAction;
  plannerQuestion?: PlanPlannerQuestion;
  plan?: AgentPlannedGoalWithTasks;
  refusal?: AgentRefusal;
}

export const agentJobTypeValues = ["message", "plan_goal"] as const;

export type AgentJobType = (typeof agentJobTypeValues)[number];

export const agentJobStatusValues = [
  "queued",
  "active",
  "completed",
  "failed",
] as const;

export type AgentJobStatus = (typeof agentJobStatusValues)[number];

export interface AgentEnqueueResponse {
  threadId: string;
  jobId: string;
}

export interface AgentJobStateResponse {
  jobId: string;
  threadId: string;
  status: AgentJobStatus;
  result?: AgentMessageResponse;
  error?: string;
}

export interface AgentStreamRunStartedEvent {
  type: "run_started";
  jobId: string;
  jobType: AgentJobType;
  threadId: string;
}

export interface AgentStreamRouterStartedEvent {
  type: "router_started";
  jobId: string;
  jobType: AgentJobType;
  threadId: string;
}

export interface AgentStreamRouterIntentResolvedEvent {
  type: "router_intent_resolved";
  jobId: string;
  jobType: AgentJobType;
  threadId: string;
  routedIntent: RoutedIntent;
}

export interface AgentStreamPlannerStartedEvent {
  type: "planner_started";
  jobId: string;
  jobType: AgentJobType;
  threadId: string;
}

export interface AgentStreamPlannerStageEvent {
  type: "planner_stage";
  jobId: string;
  jobType: AgentJobType;
  threadId: string;
  stage: PlanningStage;
  payload: Record<string, unknown>;
}

export interface AgentStreamPlannerWaitingEvent {
  type: "planner_waiting";
  jobId: string;
  jobType: AgentJobType;
  threadId: string;
  stage: PlannerQuestionStage;
  question: PlanPlannerQuestion;
}

export interface AgentStreamPlannerCompletedEvent {
  type: "planner_completed";
  jobId: string;
  jobType: AgentJobType;
  threadId: string;
  plannerAction?: PlannerAction;
}

export interface AgentStreamResultEvent {
  type: "result";
  jobId: string;
  jobType: AgentJobType;
  threadId: string;
  response: AgentMessageResponse;
}

export interface AgentStreamErrorEvent {
  type: "error";
  jobId: string;
  jobType: AgentJobType;
  threadId: string;
  message: string;
}

export interface AgentStreamDoneEvent {
  type: "done";
  jobId: string;
  jobType: AgentJobType;
  threadId: string;
}

export type AgentStreamEvent =
  | AgentStreamRunStartedEvent
  | AgentStreamRouterStartedEvent
  | AgentStreamRouterIntentResolvedEvent
  | AgentStreamPlannerStartedEvent
  | AgentStreamPlannerStageEvent
  | AgentStreamPlannerWaitingEvent
  | AgentStreamPlannerCompletedEvent
  | AgentStreamResultEvent
  | AgentStreamErrorEvent
  | AgentStreamDoneEvent;

export interface PlanningSharedState {
  threadId: string;
  userId: string;
  referenceDate: string;
  timezone: string;
  questionAnswer?: PlannerQuestionClarification | null;
}

export type PlanningStage = "intake" | "preparation" | "generation";

export type PlannerQuestionStage = "intake" | "preparation";

export const planIntakeFieldKeyValues = plannerFieldKeyValues;

export type PlanIntakeFieldKey = PlannerFieldKey;

export const planPlannerQuestionInputHintValues = [
  "free_text",
  "date_or_relative",
  "days_per_week",
] as const;

export type PlanPlannerQuestionInputHint =
  (typeof planPlannerQuestionInputHintValues)[number];

export interface PlannerQuestion {
  field: PlannerFieldKey;
  question: string;
}

export interface PlanPlannerQuestion {
  stage: PlannerQuestionStage;
  question: PlannerQuestion;
  placeholder: string;
  inputHint: PlanPlannerQuestionInputHint;
}

export interface PlanIntakeAccepted {
  goal: string;
  baseline: string;
  startDate?: string;
  relativeStartDate?: string;
  dueDate?: string;
  relativeDueDate?: string;
  daysWeeklyFrequency: number;
}

export type PlanIntakeAcceptedDraft = Partial<PlanIntakeAccepted>;

export interface PlanIntakeWaiting {
  reason: string;
  missingFields: PlanIntakeFieldKey[];
  question: PlanPlannerQuestion;
}

export interface PlanPreparationAccepted {
  goal: string;
  baseline: string;
  startDate: string;
  dueDate: string;
  daysWeeklyFrequency: number;
  goalDerivedValue: number;
  baselineDerivedValue: number;
  goalBaselineGap: number;
}

export interface PlanPreparationWaiting {
  question: PlanPlannerQuestion;
}
