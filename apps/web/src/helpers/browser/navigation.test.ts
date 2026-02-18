import { describe, expect, it, vi } from "vitest";
import { navigateBackOrPush } from "./navigation";

describe("navigateBackOrPush", () => {
  it("pushes fallback when history length is not greater than 1", () => {
    const router = {
      back: vi.fn(),
      push: vi.fn(),
    };

    navigateBackOrPush(router, "/tasks");

    expect(router.back).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/tasks");
  });

  it("goes back when history length is greater than 1", () => {
    window.history.pushState({}, "", "/tasks/create");

    const router = {
      back: vi.fn(),
      push: vi.fn(),
    };

    navigateBackOrPush(router, "/tasks");

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });
});
