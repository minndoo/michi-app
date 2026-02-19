import {
  Button as TamaguiButton,
  GetProps,
  styled,
  withStaticProperties,
} from "tamagui";

const buttonVariantStyles = {
  outlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    color: "$primary",
    borderColor: "$primary",
    hoverStyle: {
      backgroundColor: "transparent",
      borderColor: "$primaryHover",
      color: "$primaryHover",
    },
    pressStyle: {
      backgroundColor: "transparent",
      borderColor: "$borderColorPress",
    },
  },
  primary: {
    backgroundColor: "$primary",
    borderColor: "$primary",
    color: "$white2",
    hoverStyle: {
      backgroundColor: "$primaryHover",
      borderColor: "$primaryHover",
    },
    pressStyle: {
      backgroundColor: "$primaryHover",
      borderColor: "$primaryHover",
    },
  },
  secondary: {
    backgroundColor: "$secondary",
    borderColor: "$secondary",
    color: "$text",
    hoverStyle: {
      backgroundColor: "$secondaryHover",
      borderColor: "$secondaryHover",
    },
    pressStyle: {
      backgroundColor: "$secondaryActive",
      borderColor: "$secondaryActive",
    },
  },
  tertiary: {
    backgroundColor: "$tertiary",
    borderColor: "$tertiary",
    color: "$text",
    hoverStyle: {
      backgroundColor: "$tertiaryHover",
      borderColor: "$tertiaryHover",
    },
    pressStyle: {
      backgroundColor: "$tertiaryActive",
      borderColor: "$tertiaryActive",
    },
  },
  strong: {
    backgroundColor: "$strong",
    borderColor: "$strong",
    color: "$text",
    hoverStyle: {
      backgroundColor: "$strongHover",
      borderColor: "$strongHover",
    },
    pressStyle: {
      backgroundColor: "$strongHover",
      borderColor: "$strongHover",
    },
  },
} as const;

const ButtonFrame = styled(TamaguiButton.Frame, {
  variants: {
    variant: buttonVariantStyles,
  },
  defaultVariants: {
    variant: "primary",
  },
});

const ButtonComponent = styled(TamaguiButton, {
  variants: {
    variant: buttonVariantStyles,
  },
  defaultVariants: {
    variant: "primary",
  },
});

export const Button = withStaticProperties(ButtonComponent, {
  Apply: TamaguiButton.Apply,
  Frame: ButtonFrame,
  Text: TamaguiButton.Text,
  Icon: TamaguiButton.Icon,
});

export type ButtonProps = GetProps<typeof ButtonComponent>;
