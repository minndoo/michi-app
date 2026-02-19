import Link from "next/link";
import { Button, type ButtonProps as ButtonPropsBase, styled } from "@repo/ui";

type NextLinkProps = React.ComponentProps<typeof Link>;

type LinkButtonProps = NextLinkProps & {
  buttonProps?: Omit<ButtonPropsBase, "children">;
};

const ButtonFrame = styled(Button.Frame, {
  render: "div",
  role: undefined,
});

export const LinkButton = ({
  href,
  buttonProps,
  children,
  ...props
}: LinkButtonProps) => {
  return (
    <Link href={href} {...props}>
      <ButtonFrame {...buttonProps}>{children}</ButtonFrame>
    </Link>
  );
};
