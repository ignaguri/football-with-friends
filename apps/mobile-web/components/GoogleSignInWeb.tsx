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
}

export function GoogleSignInWeb({
  clientId,
  onSuccess,
  onError,
  disabled = false,
}: GoogleSignInWebProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle the credential response from Google
  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      console.log("[GoogleSignInWeb] Received credential from Google");
      setIsLoading(true);

      try {
        // Use BetterAuth's signIn.social with idToken for ID token-based auth
        // This bypasses the redirect flow and verifies the token server-side
        const result = await signIn.social({
          provider: "google",
          idToken: {
            token: response.credential,
          },
        });

        console.log("[GoogleSignInWeb] signIn.social result:", JSON.stringify(result, null, 2));

        if (result.error) {
          console.error("[GoogleSignInWeb] Sign-in error:", result.error);
          throw new Error(result.error.message || "Google sign-in failed");
        }

        // BetterAuth returns { redirect: false, token: "...", user: {...} }
        // The FULL bearer token is in the 'set-auth-token' response header,
        // which is automatically captured and stored by the custom fetch in api-client.
        // DO NOT manually store data.token as it's just the token ID, not the full bearer token.
        const data = result.data as any;

        // Check if we got a redirect URL instead of session (known BetterAuth issue #4485)
        if (data?.url && !data?.user) {
          console.log("[GoogleSignInWeb] Got redirect URL instead of session");
          throw new Error("Server returned redirect URL instead of session");
        }

        // If we have a user, the sign-in was successful
        // The bearer token was already stored by the custom fetch via set-auth-token header
        if (data?.user) {
          console.log("[GoogleSignInWeb] Sign-in successful for:", data.user.email);

          // Verify the session is working by calling getSession
          // This ensures the token is properly stored and auth works before navigating
          console.log("[GoogleSignInWeb] Verifying session...");
          const sessionResult = await getSession();

          if (sessionResult.data?.user) {
            console.log("[GoogleSignInWeb] Session verified, calling onSuccess");
            onSuccess?.();
          } else {
            console.error("[GoogleSignInWeb] Session verification failed:", sessionResult);
            throw new Error("Session verification failed after sign-in");
          }
        } else {
          console.warn("[GoogleSignInWeb] No user in response:", Object.keys(data || {}));
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
    [onSuccess, onError]
  );

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
        console.log("[GoogleSignInWeb] Waiting for GIS library to load...");
        setTimeout(initGoogleSignIn, 100);
        return;
      }

      console.log("[GoogleSignInWeb] Initializing GIS with client ID");

      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false, // Don't auto-select account
        cancel_on_tap_outside: true,
      });

      // Render the button
      if (buttonRef.current) {
        console.log("[GoogleSignInWeb] Rendering Google Sign-In button");
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: 300,
        });
      }

      setIsInitialized(true);
    };

    initGoogleSignIn();
  }, [clientId, handleCredentialResponse]);

  // Only render on web
  if (Platform.OS !== "web") {
    return null;
  }

  // Show loading overlay when processing
  return (
    <View style={styles.container}>
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
