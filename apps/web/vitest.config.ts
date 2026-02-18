import { defineConfig, mergeConfig } from "vitest/config";
import { sharedWebVitestConfig } from "./vitest.shared";

export default mergeConfig(
  sharedWebVitestConfig,
  defineConfig({
    test: {
      projects: ["./vitest.unit.config.ts", "./vitest.ui.config.ts"],
    },
  }),
);
