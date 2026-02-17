"use client";

import { Input } from "@repo/ui";
import { useController, type FieldValues, type Path } from "react-hook-form";
import { FormField } from "./FormField";
import type { FormControlProps } from "./types";

export type FormDateInputProps<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
> = FormControlProps<TFieldValues, TName>;

export const FormDateInput = <
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder = "YYYY-MM-DD",
  disabled,
  required,
}: FormDateInputProps<TFieldValues, TName>) => {
  const { field, fieldState } = useController({ control, name });
  const value = typeof field.value === "string" ? field.value : "";

  return (
    <FormField
      label={label}
      name={name}
      required={required}
      error={fieldState.error?.message}
    >
      <Input
        id={name}
        name={name}
        value={value}
        onBlur={field.onBlur}
        onChangeText={field.onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-required={required}
        aria-invalid={Boolean(fieldState.error)}
        aria-describedby={fieldState.error ? `${name}-error` : undefined}
      />
    </FormField>
  );
};
