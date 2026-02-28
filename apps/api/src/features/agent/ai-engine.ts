import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";
import { z } from "zod";
import type {
  AgentEngineResult,
  PlannerAction,
  RoutedIntent,
} from "./agent.types.js";

const routerIntentSchema = z.object({
  intent: z.enum([
    "plan_goal",
    "show_tasks",
    "show_goals",
    "show_tasks_today",
    "refuse",
  ]),
});

const plannerIntentSchema = z.object({
  intent: z.enum(["create_plan", "refuse_plan"]),
});

const RouterState = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  input: Annotation<string>(),
  intent: Annotation<RoutedIntent | null>(),
  response: Annotation<string>(),
  plannerAction: Annotation<PlannerAction | null>(),
});

const PlannerState = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  input: Annotation<string>(),
  intent: Annotation<PlannerAction | null>(),
  response: Annotation<string>(),
  plannerAction: Annotation<PlannerAction | null>(),
});

type RouterStateType = typeof RouterState.State;
type PlannerStateType = typeof PlannerState.State;

type InvokeArgs = {
  input: string;
  threadId: string;
  userId: string;
};

type LlmRole = "router" | "planner";

class AIEngine {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private routerWorkflow: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private plannerWorkflow: any = null;
  private routerModel: ChatOllama | null = null;
  private plannerModel: ChatOllama | null = null;
  private store: PostgresStore | null = null;
  private checkpointer: RedisSaver | null = null;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initializeAtCreation();
  }

  private createModel(role: LlmRole): ChatOllama {
    const prefix = role === "router" ? "ROUTER" : "PLANNER";
    const provider = (
      process.env[`${prefix}_LLM_PROVIDER`] ?? "ollama"
    ).toLowerCase();

    if (provider !== "ollama") {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    const model = process.env[`${prefix}_LLM_MODEL`] ?? "llama3.2:3b";
    const baseUrl =
      process.env[`${prefix}_LLM_BASE_URL`] ?? "http://127.0.0.1:11434";
    const tempRaw = process.env[`${prefix}_LLM_TEMPERATURE`];
    const temperature = tempRaw ? Number(tempRaw) : 0;

    return new ChatOllama({
      model,
      baseUrl,
      temperature: Number.isFinite(temperature) ? temperature : 0,
    });
  }

  private async initializeAtCreation(): Promise<void> {
    this.routerModel = this.createModel("router");
    this.plannerModel = this.createModel("planner");

    const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
    this.checkpointer = await RedisSaver.fromUrl(redisUrl);

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("POSTGRES_URL or DATABASE_URL must be set");
    }

    this.store = PostgresStore.fromConnString(connectionString, {
      ensureTables: true,
    });

    await this.store.setup();

    const plannerGraph = new StateGraph(PlannerState)
      .addNode("llmCallPlanner", async (state: PlannerStateType) => {
        const llm = this.plannerModel!.withStructuredOutput(
          plannerIntentSchema,
          {
            name: "planner_intent",
          },
        );
        const output = await llm.invoke(state.input);

        return {
          intent: output.intent,
        };
      })
      .addNode("create_plan", async () => ({
        plannerAction: "create_plan" as PlannerAction,
        response: "create_plan",
      }))
      .addNode("refuse_plan", async () => ({
        plannerAction: "refuse_plan" as PlannerAction,
        response: "refuse_plan",
      }))
      .addEdge(START, "llmCallPlanner")
      .addConditionalEdges("llmCallPlanner", (state: PlannerStateType) =>
        state.intent === "create_plan" ? "create_plan" : "refuse_plan",
      )
      .addEdge("create_plan", END)
      .addEdge("refuse_plan", END);

    const compiledPlanner = plannerGraph.compile({
      checkpointer: this.checkpointer,
      store: this.store,
    });

    this.plannerWorkflow = compiledPlanner;

    const routerGraph = new StateGraph(RouterState)
      .addNode("llmCallRouter", async (state: RouterStateType) => {
        const llm = this.routerModel!.withStructuredOutput(routerIntentSchema, {
          name: "router_intent",
        });
        const output = await llm.invoke(state.input);

        return {
          intent: output.intent,
        };
      })
      .addNode("show_tasks", async () => ({
        response: "show_tasks",
      }))
      .addNode("show_goals", async () => ({
        response: "show_goals",
      }))
      .addNode("show_tasks_today", async () => ({
        response: "show_tasks_today",
      }))
      .addNode("refuse", async () => ({
        response: "refuse",
      }))
      .addNode("plan_goal", async (state: RouterStateType) => {
        const plannerState = (await this.invokePlanner({
          input: state.input,
          threadId: state.threadId,
          userId: state.userId,
        })) as AgentEngineResult;

        return {
          response: plannerState.response,
          plannerAction: plannerState.plannerAction ?? "refuse_plan",
        };
      })
      .addEdge(START, "llmCallRouter")
      .addConditionalEdges("llmCallRouter", (state: RouterStateType) => {
        switch (state.intent) {
          case "plan_goal":
            return "plan_goal";
          case "show_tasks":
            return "show_tasks";
          case "show_goals":
            return "show_goals";
          case "show_tasks_today":
            return "show_tasks_today";
          default:
            return "refuse";
        }
      })
      .addEdge("plan_goal", END)
      .addEdge("show_tasks", END)
      .addEdge("show_goals", END)
      .addEdge("show_tasks_today", END)
      .addEdge("refuse", END);

    this.routerWorkflow = routerGraph.compile({
      checkpointer: this.checkpointer,
    });
  }

  private async invokePlanner(args: InvokeArgs): Promise<AgentEngineResult> {
    await this.initPromise;

    const result = (await this.plannerWorkflow.invoke(
      {
        threadId: args.threadId,
        userId: args.userId,
        input: args.input,
        intent: null,
        response: "",
        plannerAction: null,
      },
      {
        configurable: {
          thread_id: args.threadId,
          checkpoint_ns: args.userId,
        },
      },
    )) as PlannerStateType;

    return {
      routedIntent: "plan_goal",
      response: result.response || "refuse_plan",
      plannerAction: result.plannerAction ?? "refuse_plan",
    };
  }

  async invokeRouter(args: InvokeArgs): Promise<AgentEngineResult> {
    await this.initPromise;

    const result = (await this.routerWorkflow.invoke(
      {
        threadId: args.threadId,
        userId: args.userId,
        input: args.input,
        intent: null,
        response: "",
        plannerAction: null,
      },
      {
        configurable: {
          thread_id: args.threadId,
          checkpoint_ns: args.userId,
        },
      },
    )) as RouterStateType;

    const routedIntent = result.intent ?? "refuse";

    return {
      routedIntent,
      response: result.response || routedIntent,
      ...(routedIntent === "plan_goal" && result.plannerAction
        ? { plannerAction: result.plannerAction }
        : {}),
    };
  }
}

export const aiEngine = new AIEngine();
