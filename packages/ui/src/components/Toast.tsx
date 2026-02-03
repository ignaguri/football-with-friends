import {
  Toast as TamaguiToast,
  ToastProvider,
  useToastState,
  ToastViewport as TamaguiToastViewport,
} from "@tamagui/toast";
import { YStack } from "tamagui";

export interface ToastProps {
  children: React.ReactNode;
}

export function ToastViewport() {
  return (
    <TamaguiToastViewport
      flexDirection="column-reverse"
      top="$4"
      right="$4"
      left="$4"
    />
  );
}

function ToastContent() {
  const currentToast = useToastState();

  if (!currentToast || currentToast.isHandledNatively) return null;

  return (
    <TamaguiToast
      key={currentToast.id}
      duration={currentToast.duration}
      enterStyle={{ opacity: 0, scale: 0.5, y: -25 }}
      exitStyle={{ opacity: 0, scale: 1, y: -20 }}
      y={0}
      opacity={1}
      scale={1}
      // @ts-expect-error Tamagui accepts animation at runtime
      animation="quick"
      viewportName={currentToast.viewportName}
      backgroundColor="$background"
      borderColor="$gray7"
      borderWidth={1}
      borderRadius="$4"
      padding="$3"
    >
      <YStack>
        <TamaguiToast.Title fontSize="$4" fontWeight="600">
          {currentToast.title}
        </TamaguiToast.Title>
        {!!currentToast.message && (
          <TamaguiToast.Description fontSize="$3" color="$gray11">
            {currentToast.message}
          </TamaguiToast.Description>
        )}
      </YStack>
    </TamaguiToast>
  );
}

export function Toast({ children }: ToastProps) {
  return (
    <ToastProvider swipeDirection="horizontal">
      {children}
      <ToastContent />
      <ToastViewport />
    </ToastProvider>
  );
}
