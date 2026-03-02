import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedChatOllama = vi.fn();

vi.mock("@langchain/ollama", () => ({
  ChatOllama: mockedChatOllama,
}));

describe("createReasoningModel", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("reads REASONING_LLM env vars", async () => {
    process.env.REASONING_LLM_PROVIDER = "ollama";
    process.env.REASONING_LLM_MODEL = "llama3.2:8b";
    process.env.REASONING_LLM_BASE_URL = "http://localhost:11434";
    process.env.REASONING_LLM_TEMPERATURE = "0.4";

    const { createReasoningModel } =
      await import("../models/reasoning-model.js");

    createReasoningModel();

    expect(mockedChatOllama).toHaveBeenCalledWith({
      model: "llama3.2:8b",
      baseUrl: "http://localhost:11434",
      temperature: 0.4,
    });
  });
});
