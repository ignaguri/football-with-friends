import { AlertDialog as TamaguiAlertDialog, XStack, YStack } from "tamagui";
import { Button } from "./Button";

export interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  variant?: "default" | "destructive";
  showCancel?: boolean;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  cancelText = "Cancel",
  confirmText = "Confirm",
  onCancel,
  onConfirm,
  variant = "default",
  showCancel = true,
}: AlertDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange?.(false);
  };

  return (
    <TamaguiAlertDialog open={open} onOpenChange={onOpenChange}>
      <TamaguiAlertDialog.Portal>
        <TamaguiAlertDialog.Overlay
          key="overlay"
          // @ts-expect-error Tamagui RC: animation types need config augmentation
          animation="quick"
          backgroundColor="$overlayColor"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <TamaguiAlertDialog.Content
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
          maxWidth={400}
        >
          <YStack gap="$3">
            <TamaguiAlertDialog.Title fontSize="$6" fontWeight="bold">
              {title}
            </TamaguiAlertDialog.Title>

            {description && (
              <TamaguiAlertDialog.Description fontSize="$4" color="$gray11">
                {description}
              </TamaguiAlertDialog.Description>
            )}

            {children && (
              <TamaguiAlertDialog.Description fontSize="$4" color="$gray11" asChild>
                <div>{children}</div>
              </TamaguiAlertDialog.Description>
            )}
          </YStack>

          <XStack
            gap="$3"
            justifyContent="flex-end"
            marginTop="$6"
            paddingTop="$4"
            borderTopWidth={1}
            borderTopColor="$gray5"
          >
            {showCancel && (
              <TamaguiAlertDialog.Cancel asChild>
                <Button variant="outline" onPress={handleCancel}>
                  {cancelText}
                </Button>
              </TamaguiAlertDialog.Cancel>
            )}
            <TamaguiAlertDialog.Action asChild>
              <Button
                variant={variant === "destructive" ? "danger" : "primary"}
                onPress={handleConfirm}
              >
                {confirmText}
              </Button>
            </TamaguiAlertDialog.Action>
          </XStack>
        </TamaguiAlertDialog.Content>
      </TamaguiAlertDialog.Portal>
    </TamaguiAlertDialog>
  );
}
