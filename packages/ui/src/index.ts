// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="tamagui.d.ts" />

// baseline components: all from tamagui
export * from "tamagui";

// overrides for baseline components with our own wrappers
export { XStack, YStack, type XStackProps, type YStackProps } from "./Stack";

// custom components
export * from "./UIProvider";
export * from "./DatePicker";
export * from "./Tabs";
export {
  Button,
  ButtonFrame,
  ButtonIcon,
  ButtonText,
  type ButtonProps,
} from "./Button";
export {
  Checkbox,
  CheckboxFrame,
  CheckboxIndicatorFrame,
  type CheckboxProps,
} from "./Checkbox";
