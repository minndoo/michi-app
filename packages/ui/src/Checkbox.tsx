import { Check } from "@tamagui/lucide-icons";
import {
  Checkbox as TamaguiCheckbox,
  GetProps,
  Spinner,
  withStaticProperties,
} from "tamagui";

export const CheckboxFrame = TamaguiCheckbox;
export const CheckboxIndicatorFrame = TamaguiCheckbox.Indicator;

type BaseProps = GetProps<typeof TamaguiCheckbox>;

type CheckboxExtraProps = {
  loading?: boolean;
  bg?: BaseProps["backgroundColor"] | null;
};

export type CheckboxProps = BaseProps & CheckboxExtraProps;

const CheckboxComponent = TamaguiCheckbox.styleable<CheckboxExtraProps>(
  ({ loading, bg, borderColor, checked, ...props }, ref) => {
    const resolvedBackground = bg ?? (checked ? "$color8" : "$white0");

    const resolvedBorderColor =
      borderColor ?? (checked ? "$outlineColor" : "$borderColor");

    return (
      <CheckboxFrame
        bg={resolvedBackground}
        borderColor={resolvedBorderColor}
        checked={checked}
        {...props}
        ref={ref}
        role="checkbox"
        hoverStyle={{
          cursor: "pointer",
        }}
      >
        <CheckboxIndicatorFrame>
          {loading ? (
            <Spinner color="$white2" />
          ) : (
            <Check size="$1" color="$white2" />
          )}
        </CheckboxIndicatorFrame>
      </CheckboxFrame>
    );
  },
);

export const Checkbox = withStaticProperties(CheckboxComponent, {
  Frame: CheckboxFrame,
  Indicator: CheckboxIndicatorFrame,
});
