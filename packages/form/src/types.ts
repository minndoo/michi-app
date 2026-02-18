import type { Control, FieldValues, Path } from "react-hook-form";

export type FormGrow = number | "unset";

export type FormControlProps<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
> = {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  grow?: FormGrow;
};

export type FormSelectOption = {
  label: string;
  value: string;
};

export type FormManagedControlPropKeys =
  | "id"
  | "name"
  | "value"
  | "onBlur"
  | "onChange"
  | "onChangeText"
  | "onValueChange"
  | "required"
  | "disabled"
  | "placeholder"
  | "aria-invalid"
  | "aria-describedby"
  | "aria-required";
