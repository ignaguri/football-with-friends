"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ServiceWorkerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      console.log("[SW] Service Worker registered successfully:", registration);

      // Handle service worker updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New service worker is available
            console.log("[SW] New service worker available");

            // Optionally notify user about update
            toast.info("New version available", {
              description: "Refresh to update the app",
              action: {
                label: "Refresh",
                onClick: () => window.location.reload(),
              },
              duration: 10000,
            });
          }
        });
      });

      // Check for updates periodically (every hour)
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000,
      );
    } catch (error) {
      console.error("[SW] Service Worker registration failed:", error);
    }
  };

  return <>{children}</>;
}
