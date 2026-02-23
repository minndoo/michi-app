# packages/ui Agent Rules

## References
- UI rules: `../../docs/agents/ui.md`

## Scope
- Ignore API/migration rules by default.

## Prompt Generation Guard Rail
- When creating/updating Tamagui components or wrappers, verify compound component discoverability in generated prompt output.
- Default rule: do not regenerate or modify `ai/tamagui.prompt.md` unless the user explicitly requests prompt refresh.
- If the user explicitly requests prompt refresh, run `cd apps/web && bun run generate:tamagui-prompt` and review `Checkbox`/`Button` compound entries in the generated component list.
