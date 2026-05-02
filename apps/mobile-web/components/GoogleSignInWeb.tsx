// Web-only Google Sign-In component using Google Identity Services
// This bypasses the redirect-based OAuth flow that has cross-domain cookie issues
// by using ID token authentication instead

import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { signIn, getSession } from "@repo/api-client";

// Types for Google Identity Services are declared in ../types/google.d.ts

interface GoogleSignInWebProps {
  clientId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  renderCustomButton?: (onClick: () => void) => React.ReactNode;
}

export function GoogleSignInWeb({
  clientId,
  onSuccess,
  onError,
  disabled = false,
  renderCustomButton,
}: GoogleSignInWebProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const hiddenButtonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle the credential response from Google
  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      setIsLoading(true);

      try {
        const result = await signIn.social({
          provider: "google",
          idToken: {
            token: response.credential,
          },
        });

        if (result.error) {
          console.error("[GoogleSignInWeb] Sign-in error:", result.error);
          throw new Error(result.error.message || "Google sign-in failed");
        }

        const data = result.data as any;

        if (data?.url && !data?.user) {
          throw new Error("Server returned redirect URL instead of session");
        }

        if (data?.user) {
          const sessionResult = await getSession();

          if (sessionResult.data?.user) {
            onSuccess?.();
          } else {
            console.error("[GoogleSignInWeb] Session verification failed:", sessionResult);
            throw new Error("Session verification failed after sign-in");
          }
        } else {
          throw new Error("No user data received from server");
        }
      } catch (err) {
        console.error("[GoogleSignInWeb] Error:", err);
        const message = err instanceof Error ? err.message : "Sign-in failed";
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  // Trigger Google Sign-In by clicking the hidden button
  const triggerGoogleSignIn = useCallback(() => {
    const btn = hiddenButtonRef.current?.querySelector('[role="button"]');
    if (btn) {
      (btn as HTMLElement).click();
    }
  }, []);

  // Initialize Google Identity Services
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    if (!clientId) {
      console.error("[GoogleSignInWeb] Missing Google Client ID");
      return;
    }

    const initGoogleSignIn = () => {
      // Wait for GIS library to load
      if (!window.google?.accounts?.id) {
        setTimeout(initGoogleSignIn, 100);
        return;
      }

      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false, // Don't auto-select account
        cancel_on_tap_outside: true,
      });

      const buttonConfig = {
        theme: "outline" as const,
        size: "large" as const,
        type: "standard" as const,
        text: "signin_with" as const,
        shape: "rectangular" as const,
        logo_alignment: "left" as const,
        width: 300,
      };

      if (hiddenButtonRef.current) {
        window.google.accounts.id.renderButton(hiddenButtonRef.current, buttonConfig);
      }

      if (!renderCustomButton && buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, buttonConfig);
      }

      setIsInitialized(true);
    };

    initGoogleSignIn();
  }, [clientId, handleCredentialResponse, renderCustomButton]);

  // Only render on web
  if (Platform.OS !== "web") {
    return null;
  }

  // Show loading overlay when processing
  return (
    <View style={styles.container}>
      {/* Hidden official button (always rendered for authentication) */}
      <div ref={hiddenButtonRef} style={{ display: "none" }} aria-hidden="true" />

      {/* Custom button OR official visible button */}
      {renderCustomButton ? (
        renderCustomButton(triggerGoogleSignIn)
      ) : (
        <div
          ref={buttonRef}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            opacity: isLoading || disabled ? 0.5 : 1,
            pointerEvents: isLoading || disabled ? "none" : "auto",
          }}
        />
      )}

      {!isInitialized && !clientId && (
        <div style={{ color: "red", fontSize: 12, marginTop: 8 }}>
          Google Client ID not configured
        </div>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
});
