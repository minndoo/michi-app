import { View } from "@repo/ui";

export const FloatingIconCard = ({
  children,
  t,
  l,
  r,
  className,
}: {
  children: React.ReactNode;
  t: number;
  l?: number;
  r?: number;
  className?: string;
}) => (
  <View
    position="absolute"
    t={t}
    l={l}
    r={r}
    minW={84}
    minH={84}
    bg="$white2"
    rounded="$8"
    borderWidth={1}
    borderColor="$borderColor"
    items="center"
    justify="center"
    shadowColor="$shadowColor"
    shadowOpacity={0.08}
    shadowRadius={10}
    shadowOffset={{ width: 0, height: 3 }}
    className={className}
  >
    {children}
  </View>
);
