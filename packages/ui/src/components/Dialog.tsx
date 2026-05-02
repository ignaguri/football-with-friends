import { Dialog as TamaguiDialog, DialogProps, XStack } from "tamagui";
import { X } from "@tamagui/lucide-icons-2";
import { Button } from "./Button";

export interface CustomDialogProps extends DialogProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showActions?: boolean;
  showClose?: boolean;
}

export function Dialog({
  title,
  description,
  children,
  trigger,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  showActions = true,
  showClose = true,
  ...props
}: CustomDialogProps) {
  return (
    <TamaguiDialog {...props}>
      {trigger && (
        <TamaguiDialog.Trigger asChild>{trigger}</TamaguiDialog.Trigger>
      )}

      <TamaguiDialog.Portal>
        <TamaguiDialog.Overlay
          key="overlay"
          // @ts-expect-error Tamagui RC: animation types need config augmentation
          animation="quick"
          backgroundColor="$overlayColor"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <TamaguiDialog.Content
          bordered
          elevate
          key="content"
          animateOnly={["transform", "opacity"]}
          // @ts-expect-error Tamagui RC: animation types need config augmentation
          animation={[
            "quick",
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          gap="$4"
          padding="$5"
          backgroundColor="$background"
          borderRadius="$6"
          width="90%"
          maxWidth={500}
        >
          {title && (
            <XStack justifyContent="space-between" alignItems="center">
              <TamaguiDialog.Title fontSize="$6" fontWeight="bold">
                {title}
              </TamaguiDialog.Title>
              {showClose && (
                <TamaguiDialog.Close asChild>
                  <Button
                    variant="ghost"
                    size="$3"
                    circular
                    icon={X}
                    padding="$2"
                  />
                </TamaguiDialog.Close>
              )}
            </XStack>
          )}

          {description && (
            <TamaguiDialog.Description fontSize="$4" color="$gray11">
              {description}
            </TamaguiDialog.Description>
          )}

          {children}

          {showActions && (
            <XStack
              gap="$3"
              justifyContent="flex-end"
              marginTop="$6"
              paddingTop="$4"
              borderTopWidth={1}
              borderTopColor="$gray5"
            >
              <TamaguiDialog.Close asChild>
                <Button variant="outline" onPress={onCancel}>
                  {cancelText}
                </Button>
              </TamaguiDialog.Close>
              <Button variant="primary" onPress={onConfirm}>
                {confirmText}
              </Button>
            </XStack>
          )}
        </TamaguiDialog.Content>
      </TamaguiDialog.Portal>
    </TamaguiDialog>
  );
}
