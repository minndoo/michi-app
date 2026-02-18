import { defineConfig, mergeConfig } from "vitest/config";
import { sharedWebVitestConfig } from "./vitest.shared";

export default mergeConfig(
  sharedWebVitestConfig,
  defineConfig({
    test: {
      name: "ui",
      environment: "jsdom",
      include: [
        "src/helpers/browser/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/*.test.ts",
      ],
      exclude: ["src/helpers/tests/**/*.test.ts"],
    },
  }),
);
