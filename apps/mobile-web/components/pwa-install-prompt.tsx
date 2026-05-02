import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { AnimatePresence, Button, XStack, YStack, Text } from "tamagui";
import { X } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    // Check if user already dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed === "true") return;

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default mini-infobar
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after 5 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }

    // Clear the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    // Remember dismissal
    if (typeof window !== "undefined") {
      localStorage.setItem("pwa-install-dismissed", "true");
    }
    setShowPrompt(false);
  };

  // Don't render on native platforms
  if (Platform.OS !== "web") return null;

  return (
    <AnimatePresence>
      {showPrompt && deferredPrompt && (
        <YStack
          position="fixed"
          bottom={0}
          left={0}
          right={0}
          backgroundColor="$background"
          borderTopWidth={1}
          borderTopColor="$borderColor"
          padding="$4"
          zIndex={1000}
          animation="quick"
          enterStyle={{
            y: 100,
            opacity: 0,
          }}
          exitStyle={{
            y: 100,
            opacity: 0,
          }}
          shadowColor="$shadowColor"
          shadowOffset={{ width: 0, height: -2 }}
          shadowOpacity={0.1}
          shadowRadius={8}
        >
          <XStack
            gap="$3"
            alignItems="center"
            justifyContent="space-between"
            maxWidth={600}
            width="100%"
            marginHorizontal="auto"
          >
            <YStack flex={1} gap="$1">
              <Text fontSize="$5" fontWeight="600" color="$color">
                {t("pwa.installTitle")}
              </Text>
              <Text fontSize="$3" color="$color11">
                {t("pwa.installDescription")}
              </Text>
            </YStack>

            <XStack gap="$2" alignItems="center">
              <Button
                size="$3"
                variant="outlined"
                onPress={handleDismiss}
                icon={X}
                circular
                chromeless
              />
              <Button
                size="$3"
                theme="green"
                onPress={handleInstall}
                fontWeight="600"
              >
                {t("pwa.install")}
              </Button>
            </XStack>
          </XStack>
        </YStack>
      )}
    </AnimatePresence>
  );
}
