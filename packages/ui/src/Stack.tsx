import {
  XStack as XStackBase,
  YStack as YStackBase,
  GetProps,
  styled,
} from "tamagui";

const stackVariants = {
  justifyContent: {
    center: { justifyContent: "center" as const },
    "flex-start": { justifyContent: "flex-start" as const },
    "flex-end": { justifyContent: "flex-end" as const },
    "space-between": { justifyContent: "space-between" as const },
    "space-around": { justifyContent: "space-around" as const },
    "space-evenly": { justifyContent: "space-evenly" as const },
  },
  alignItems: {
    center: { alignItems: "center" as const },
    "flex-start": { alignItems: "flex-start" as const },
    "flex-end": { alignItems: "flex-end" as const },
    stretch: { alignItems: "stretch" as const },
    baseline: { alignItems: "baseline" as const },
  },
} as const;

export const XStack = styled(XStackBase, {
  name: "XStack",
  variants: stackVariants,
});

export const YStack = styled(YStackBase, {
  name: "YStack",
  variants: stackVariants,
});

export type XStackProps = GetProps<typeof XStack>;
export type YStackProps = GetProps<typeof YStack>;
