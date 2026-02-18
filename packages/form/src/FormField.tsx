import React from "react";
import { Label, Text, YStack } from "@repo/ui";
import {
  useController,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Asterisk } from "@repo/ui/icons";
import type { FormControlProps } from "./types";

export type FormFieldContext<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
> = {
  id: string;
  name: TName;
  field: ControllerRenderProps<TFieldValues, TName>;
  error?: string;
  ariaInvalid: boolean;
  ariaDescribedBy?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
};

export type FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
> = FormControlProps<TFieldValues, TName> & {
  children: (context: FormFieldContext<TFieldValues, TName>) => React.ReactNode;
};

export const FormField = <
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
>({
  control,
  label,
  name,
  placeholder,
  disabled,
  required = false,
  grow,
  children,
}: FormFieldProps<TFieldValues, TName>) => {
  const { field, fieldState } = useController({ control, name });
  const error = fieldState.error?.message;
  const id = String(name);
  const errorId = `${id}-error`;
  const ariaDescribedBy = error ? errorId : undefined;

  return (
    <YStack
      gap="$2"
      style={{ flexGrow: grow === "unset" ? undefined : grow }}
    >
      <Label color="$outlineColor" htmlFor={id}>
        {label}
        {required ? <Asterisk color="$colorDanger" size="$1" /> : null}
      </Label>
      {children({
        id,
        name,
        field,
        error,
        ariaInvalid: Boolean(error),
        ariaDescribedBy,
        disabled,
        required,
        placeholder,
      })}
      {error ? (
        <Text color="$colorDanger" fontSize="$3" id={errorId}>
          {error}
        </Text>
      ) : null}
    </YStack>
  );
};
