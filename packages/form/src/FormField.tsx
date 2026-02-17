import React from "react";
import { Label, Text, YStack } from "@repo/ui";
import { Asterisk } from "@repo/ui/icons";

export type FormFieldProps = {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

export const FormField = ({
  label,
  name,
  required = false,
  error,
  children,
}: FormFieldProps) => {
  return (
    <YStack gap="$2">
      <Label color="$outlineColor" htmlFor={name}>
        {label}
        {required ? <Asterisk color="$colorDanger" size="$1" /> : null}
      </Label>
      {children}
      {error ? (
        <Text color="$colorDanger" fontSize="$3" id={`${name}-error`}>
          {error}
        </Text>
      ) : null}
    </YStack>
  );
};
