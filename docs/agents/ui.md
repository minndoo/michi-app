# UI Rules

**IMPORTANT: For styling and UI work always check this document.**

For UI work, always read ai/tamagui.prompt.md.
Treat it as authoritative. Never restate it.
If this file conflicts with ai/tamagui.prompt.md, ai/tamagui.prompt.md is canonical.

## Styling rules (Tamagui)

- Never hardcode hex colors in components.
- Always access theme values with $
- 12-step color scale convention:
  - $color1-4: backgrounds (subtle to emphasized)
  - $color5-6: borders and separators
  - $color7-8: interactive states (hover/active)
  - $color9-10: solid/accent backgrounds
  - $color11-12: text (low to high contrast)
- When mapping designs/screenshots, assign colors by role into this scale first, then use only $color\* tokens in components (no hex values).

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
