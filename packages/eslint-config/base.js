import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "no-unused-vars": ["error", {
        args: "all",
        argsIgnorePattern: "^_",
        caughtErrors: "all",
        destructuredArrayIgnorePattern: "^_",
      }],
      "no-unused-imports": ["error"],
      "no-unused-expressions": ["warn", { allowShortCircuit: true, allowTernary: true }],
      "no-unused-labels": ["warn"],
      "no-unused-modules": ["warn"],
      "no-unused-properties": ["warn"],
      "no-unused-results": ["warn"],
      "no-unused-returns": ["warn"],
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ["dist/**"],
  },
];
