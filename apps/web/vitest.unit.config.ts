import { defineConfig, mergeConfig } from "vitest/config";
import { sharedWebVitestConfig } from "./vitest.shared";

export default mergeConfig(
  sharedWebVitestConfig,
  defineConfig({
    test: {
      name: "unit",
      environment: "node",
      include: ["src/helpers/**/*.test.ts"],
      exclude: ["src/helpers/browser/**/*.test.ts", "src/**/*.test.tsx"],
    },
  }),
);
