import { ChatOllama } from "@langchain/ollama";

export const createPlannerModel = (): ChatOllama => {
  const provider = (process.env.PLANNER_LLM_PROVIDER ?? "ollama").toLowerCase();

  if (provider !== "ollama") {
    throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  const model = process.env.PLANNER_LLM_MODEL ?? "llama3.2:3b";
  const baseUrl = process.env.PLANNER_LLM_BASE_URL ?? "http://127.0.0.1:11434";
  const tempRaw = process.env.PLANNER_LLM_TEMPERATURE;
  const temperature = tempRaw ? Number(tempRaw) : 0;

  return new ChatOllama({
    model,
    baseUrl,
    temperature: Number.isFinite(temperature) ? temperature : 0,
  });
};
