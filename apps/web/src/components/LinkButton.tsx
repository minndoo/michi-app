import Link, { type LinkProps } from "next/link";
import {
  LinkButton as LinkButtonBase,
  type LinkButtonProps as LinkButtonPropsBase,
} from "@repo/ui";

type LinkButtonProps = {
  children: React.ReactNode;
  href: LinkProps["href"];
  buttonProps?: Omit<LinkButtonPropsBase, "children">;
  linkProps?: Omit<LinkProps, "href" | "children">;
};

export const LinkButton = ({
  children,
  href,
  linkProps,
  buttonProps,
}: LinkButtonProps) => {
  return (
    <Link href={href} {...linkProps}>
      <LinkButtonBase {...buttonProps}>{children}</LinkButtonBase>
    </Link>
  );
};
