import path from "node:path";

const quote = (file) => JSON.stringify(file);
const fromWorkspace = (files, workspace) =>
  files
    .map((file) => path.relative(workspace, file))
    .map(quote)
    .join(" ");

export default {
  "apps/api/**/*.{js,jsx,ts,tsx}": (files) => [
    `bun run --cwd apps/api lint -- --fix ${fromWorkspace(files, "apps/api")}`,
    `prettier --write ${files.map(quote).join(" ")}`,
  ],
  "apps/web/**/*.{js,jsx,ts,tsx}": (files) => [
    `bun run --cwd apps/web lint -- --fix ${fromWorkspace(files, "apps/web")}`,
    `prettier --write ${files.map(quote).join(" ")}`,
  ],
  "packages/ui/**/*.{js,jsx,ts,tsx}": (files) => [
    `bun run --cwd packages/ui lint -- --fix ${fromWorkspace(files, "packages/ui")}`,
    `prettier --write ${files.map(quote).join(" ")}`,
  ],
  "*.{json,md,css,scss,yml,yaml}": "prettier --write",
};
