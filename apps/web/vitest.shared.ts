import { fileURLToPath } from "node:url";
import type { ViteUserConfig } from "vitest/config";

export const sharedWebVitestConfig: Pick<ViteUserConfig, "resolve" | "test"> = {
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    passWithNoTests: true,
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/.tamagui/**",
    ],
  },
};
