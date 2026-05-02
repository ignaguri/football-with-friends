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
  return <TamaguiToastViewport flexDirection="column-reverse" top="$4" right="$4" left="$4" />;
}

function ToastContent() {
  const currentToast = useToastState();

  if (!currentToast || currentToast.isHandledNatively) return null;

  // Get variant from custom data (default to "default")
  const variant = (currentToast.customData as any)?.variant || "default";

  // Define colors based on variant
  const getColors = () => {
    switch (variant) {
      case "success":
        return {
          bg: "$green3",
          border: "$green8",
          text: "$green12",
        };
      case "error":
        return {
          bg: "$red3",
          border: "$red8",
          text: "$red12",
        };
      default:
        return {
          bg: "$gray3",
          border: "$gray8",
          text: "$gray12",
        };
    }
  };

  const colors = getColors();

  return (
    <TamaguiToast
      key={currentToast.id}
      duration={currentToast.duration}
      enterStyle={{ opacity: 0, scale: 0.5, y: -25 }}
      exitStyle={{ opacity: 0, scale: 1, y: -20 }}
      y={0}
      opacity={1}
      scale={1}
      // @ts-expect-error Tamagui RC: animation types need config augmentation
      animation="quick"
      viewportName={currentToast.viewportName}
      backgroundColor={colors.bg}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius="$4"
      padding="$3"
    >
      <YStack>
        <TamaguiToast.Title fontSize="$4" fontWeight="600" color={colors.text}>
          {currentToast.title}
        </TamaguiToast.Title>
        {!!currentToast.message && (
          <TamaguiToast.Description fontSize="$3" color={colors.text}>
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
