import type { Control, FieldValues, Path } from "react-hook-form";

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
};

export type FormSelectOption = {
  label: string;
  value: string;
};
