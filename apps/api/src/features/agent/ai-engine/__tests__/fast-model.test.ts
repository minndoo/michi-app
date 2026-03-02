import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedChatOllama = vi.fn();

vi.mock("@langchain/ollama", () => ({
  ChatOllama: mockedChatOllama,
}));

describe("createFastModel", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("reads FAST_LLM env vars", async () => {
    process.env.FAST_LLM_PROVIDER = "ollama";
    process.env.FAST_LLM_MODEL = "llama3.2:3b";
    process.env.FAST_LLM_BASE_URL = "http://localhost:11434";
    process.env.FAST_LLM_TEMPERATURE = "0.2";

    const { createFastModel } = await import("../models/fast-model.js");

    createFastModel();

    expect(mockedChatOllama).toHaveBeenCalledWith({
      model: "llama3.2:3b",
      baseUrl: "http://localhost:11434",
      temperature: 0.2,
    });
  });
});
