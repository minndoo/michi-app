For UI work, always read ai/tamagui.prompt.md.
Treat it as authoritative. Never restate it.

# Styling rules (Tamagui)

- Never hardcode hex colors in components.
- Always use semantic theme tokens: $background, $backgroundStrong, $color, $colorMuted, $borderColor, $outlineColor, $shadowColor.
Examples:
✅ <YStack backgroundColor="$background" />
✅ <Text color="$colorMuted" />
❌ <YStack backgroundColor="#F6F8F7" />
❌ <YStack backgroundColor="$color3" />

- There could be tokens with duplicate hex code like $backgroundHard and $outlineColor where both have the value #6FA58C. Always try to use relevant token name to it's function used
Examples:
✅ <View backgroundColor="$backgroundHard" />
✅ <View outline="2px solid $outlineColor" />
❌ <View backgroundColor="$outlineColor" />
❌ <YStack outline="2px solid $backgroundColor" />

# Breakpoints rules
- Always design or create for mobile-first approach and then scaleup to tablet and then desktop
- When scaling up, always use min media queries
- Scales are as follow (described with Tamagui breakpoint tokens)
Mobile: default
Tablet: $md
Desktop: $xl

Examples:
<View gap="$1.5" $md={{ gap: "$2" }} $xl={{ gap: "$3" }} />

# Component rules

- When looking up components. Always try to locate components folder within the project. In apps/web the components folder is aliased under @/components. If you can't find relevant components, only then lookup the @repo/ui package
