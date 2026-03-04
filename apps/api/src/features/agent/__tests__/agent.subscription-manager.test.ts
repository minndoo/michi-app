import { describe, expect, it, vi } from "vitest";
import { createAgentSubscriptionManager } from "../agent.subscription-manager.js";

describe("agent subscription manager", () => {
  it("reuses one Redis subscription per channel and fans out messages", async () => {
    let redisListener: ((message: string) => void) | null = null;
    const subscribe = vi.fn(
      async (_channel: string, listener: (message: string) => void) => {
        redisListener = listener;
      },
    );
    const unsubscribe = vi.fn(async () => undefined);
    const manager = createAgentSubscriptionManager({
      getClient: vi.fn().mockResolvedValue({
        subscribe,
        unsubscribe,
      }),
    });
    const firstListener = vi.fn();
    const secondListener = vi.fn();

    const removeFirst = await manager.subscribe({
      channel: "agent:plan_goal:job-1:events",
      listener: firstListener,
    });
    const removeSecond = await manager.subscribe({
      channel: "agent:plan_goal:job-1:events",
      listener: secondListener,
    });

    expect(subscribe).toHaveBeenCalledTimes(1);

    redisListener?.(
      JSON.stringify({
        type: "planner_waiting",
        jobId: "job-1",
        jobType: "plan_goal",
        threadId: "thread-1",
        stage: "intake",
        question: {
          stage: "intake",
          question: {
            field: "goal",
            question: "What exactly do you want to achieve?",
          },
          placeholder: "Example: Run a 10k race",
          inputHint: "free_text",
        },
      }),
    );

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);

    await removeFirst();
    expect(unsubscribe).not.toHaveBeenCalled();

    await removeSecond();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledWith("agent:plan_goal:job-1:events");
  });
});
