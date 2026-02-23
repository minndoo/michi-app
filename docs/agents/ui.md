# UI Rules

**IMPORTANT: For styling and UI work always check this document.**

For UI work, always read ai/tamagui.prompt.md.
Treat it as authoritative. Never restate it.
If this file conflicts with ai/tamagui.prompt.md, ai/tamagui.prompt.md is canonical.

## Styling rules (Tamagui)

- Never hardcode hex colors in components.
- Always access theme values with $

## Component rules

- When looking up components. Always try to locate components folder within the project. In apps/web the components folder is aliased under @/components. If you can't find relevant components, only then lookup the @repo/ui package
- Check ai/tamagui.prompt.md for available components
- Do NOT implement UI controls using Stack/View if Tamagui has a component.
- Use:
  - Checkbox (+ Checkbox.IndicatorFrame) for checkboxes
  - Progress (+ Progress.IndicatorFrame + Progress.Indicator) for progress bars
  - Switch for toggles
  - RadioGroup for radios
  - Select (or your select wrapper) for selects
  - Button for buttons (no pressable Views)
  - Input / TextArea for inputs
- Only use Stack/XStack/YStack for layout and spacing.
- If unsure whether a component exists, assume it does and search for it in the existing codebase imports.
