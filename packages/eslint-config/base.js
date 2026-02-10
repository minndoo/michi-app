import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";
import unusedImportsPlugin from "eslint-plugin-unused-imports";

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
      "unused-imports": unusedImportsPlugin,
      onlyWarn,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "no-unused-vars": ["warn", {
        args: "all",
        argsIgnorePattern: "^_",
        caughtErrors: "all",
        destructuredArrayIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-unused-vars": ["warn", {
        args: "all",
        argsIgnorePattern: "^_",
        caughtErrors: "all",
        destructuredArrayIgnorePattern: "^_",
      }],
      "unused-imports/no-unused-imports": ["warn"],
      "no-unused-expressions": ["warn", { allowShortCircuit: true, allowTernary: true }],
    },
  },
  {
    ignores: ["dist/**", ".tamagui", ".tamagui/**"],
  },
];
