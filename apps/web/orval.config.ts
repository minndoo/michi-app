import { defineConfig } from "orval";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const localSpecPath = resolve(
  process.cwd(),
  "../api/src/generated/swagger.json",
);
const inputTarget =
  process.env.ORVAL_INPUT ||
  (existsSync(localSpecPath) ? localSpecPath : undefined);

if (!inputTarget) {
  throw new Error(
    "No OpenAPI input found. Set ORVAL_INPUT (for deploys) or generate apps/api/src/generated/swagger.json locally.",
  );
}

export default defineConfig({
  web: {
    input: {
      target: inputTarget,
    },
    output: {
      target: "src/lib/api/generated/index.ts",
      schemas: "src/lib/api/generated/model",
      client: "react-query",
      mode: "tags-split",
      clean: true,
      override: {
        mutator: {
          path: "./src/lib/api/mutator.ts",
          name: "apiClient",
        },
      },
    },
  },
});
