"use client";

import { useRouter } from "next/navigation";
import { Button, Dialog, Text, XStack, useMedia } from "@repo/ui";

export type GoalRouteModalProps = {
  title: string;
  children: React.ReactNode;
};

export const GoalRouteModal = ({ title, children }: GoalRouteModalProps) => {
  const router = useRouter();
  const media = useMedia();
  const isTabletUp = media.md;

  return (
    <Dialog
      open
      modal
      onOpenChange={(open) => (!open ? router.back() : undefined)}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          key="goal-route-modal-overlay"
          bg="$shadowColor"
          opacity={0.4}
        />
        <Dialog.Content
          key="goal-route-modal-content"
          bordered
          elevate
          fullscreen={!isTabletUp}
          bg="$background"
          borderColor="$borderColor"
          p="$4"
          gap="$4"
          overflowY="scroll"
          $md={{
            rounded: "$6",
            width: "100%",
            maxW: "$screen.md",
            maxH: "88vh",
          }}
        >
          <XStack items="center" justify="space-between">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="outlined">
                <Text color="$outlineColor">Close</Text>
              </Button>
            </Dialog.Close>
          </XStack>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
