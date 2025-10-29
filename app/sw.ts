// Service Worker with PWA caching and push notification support
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

import type { PrecacheEntry } from "@serwist/precaching";
// @ts-expect-error - Serwist types not available in service worker context

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API routes cache strategy
    {
      urlPattern: /^https?:\/\/.*\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
        cacheKeyWillBeUsed: async ({ request }: { request: Request }) => {
          return `${request.url}`;
        },
      },
    },
    // Images cache strategy
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "images-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    // Static assets cache strategy
    {
      urlPattern: /\.(?:js|css|woff|woff2|ttf|eot)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    // Fonts cache strategy
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-cache",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    ...defaultCache,
  ],
});

// Push notification event handler
self.addEventListener("push", (event: PushEvent) => {
  console.log("[SW] Push event received", event);

  if (!event.data) {
    console.log("[SW] Push event has no data");
    return;
  }

  try {
    const data = event.data.json();
    console.log("[SW] Push notification data:", data);

    const options: NotificationOptions = {
      body: data.body,
      icon: data.icon || "/icons/icon-192x192.png",
      badge: data.badge || "/icons/badge-72x72.png",
      ...(data.image && { image: data.image }),
      actions: data.actions || [],
      data: {
        type: data.data?.type,
        matchId: data.data?.matchId,
        url: data.data?.url || "/",
        ...data.data,
      },
      requireInteraction: data.urgent || false,
      silent: data.silent || false,
      tag: data.tag || data.data?.type,
      timestamp: data.timestamp || Date.now(),
      vibrate: data.vibrate || [200, 100, 200],
      dir: "auto",
      lang: "en",
    };

    event.waitUntil(
      self.registration
        .showNotification(data.title, options)
        .then(() => {
          console.log("[SW] Notification shown successfully");
          // Track notification display
          return trackNotificationEvent("displayed", data.data?.matchId);
        })
        .catch((error: Error) => {
          console.error("[SW] Error showing notification:", error);
        }),
    );
  } catch (error) {
    console.error("[SW] Error parsing push notification data:", error);
  }
});

// Notification click handler
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  console.log("[SW] Notification click event:", event);

  const notification = event.notification;
  const { type, matchId, url } = notification.data;

  notification.close();

  // Track notification click
  trackNotificationEvent("clicked", matchId);

  // Handle different action types
  if (event.action) {
    console.log("[SW] Notification action clicked:", event.action);

    event.waitUntil(
      handleNotificationAction(event.action, { type, matchId, url }),
    );
  } else {
    // Default click action - navigate to URL
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clientList) => {
        // If app is already open, focus and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client && url) {
              return client.navigate(url);
            }
            return;
          }
        }

        // Open new window if app is not open
        if (self.clients.openWindow) {
          return self.clients.openWindow(url || "/");
        }
      }),
    );
  }
});

// Notification close handler
self.addEventListener("notificationclose", (event: NotificationEvent) => {
  console.log("[SW] Notification closed:", event);
  const { matchId } = event.notification.data;
  trackNotificationEvent("dismissed", matchId);
});

// Handle specific notification actions
async function handleNotificationAction(
  action: string,
  data: { type: string; matchId: string; url: string },
): Promise<void> {
  switch (action) {
    case "view":
      // Navigate to match details
      return navigateToUrl(data.url);

    case "join":
      // Navigate to match with join action
      return navigateToUrl(`${data.url}?action=join`);

    case "remind_later":
      // Schedule a new reminder (this would need API call)
      console.log("[SW] Remind later action - would reschedule notification");
      break;

    default:
      console.log("[SW] Unknown notification action:", action);
      return navigateToUrl(data.url);
  }
}

// Navigate to URL helper
async function navigateToUrl(url: string): Promise<void> {
  const clientList = await self.clients.matchAll({ type: "window" });

  // If app is already open, focus and navigate
  for (const client of clientList) {
    if ("focus" in client) {
      await client.focus();
      if ("navigate" in client) {
        await client.navigate(url);
        return;
      }
      return;
    }
  }

  // Open new window if app is not open
  if (self.clients.openWindow) {
    await self.clients.openWindow(url);
  }
}

// Track notification events for analytics
async function trackNotificationEvent(
  event: "displayed" | "clicked" | "dismissed",
  matchId?: string,
): Promise<void> {
  try {
    // Send tracking data to analytics endpoint
    await fetch("/api/analytics/notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        matchId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
    });
  } catch (error) {
    console.error("[SW] Error tracking notification event:", error);
  }
}

// Background sync for offline actions (future enhancement)
self.addEventListener("sync", (event: Event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === "match-signup") {
    syncEvent.waitUntil(syncOfflineSignups());
  }
});

// Sync offline match signups when back online
async function syncOfflineSignups(): Promise<void> {
  try {
    // Get offline signups from IndexedDB (would need to implement)
    console.log("[SW] Syncing offline match signups...");

    // This would send queued signups to the server
    // Implementation would depend on offline storage strategy
  } catch (error) {
    console.error("[SW] Error syncing offline signups:", error);
  }
}

// Install event - cache essential resources
self.addEventListener("install", (event: Event) => {
  console.log("[SW] Service Worker installing...");

  (event as ExtendableEvent).waitUntil(
    caches.open("essential-cache-v1").then((cache) => {
      return cache.addAll([
        "/",
        "/matches",
        "/icons/icon-192x192.png",
        "/icons/icon-512x512.png",
        "/manifest.json",
      ]);
    }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event: Event) => {
  console.log("[SW] Service Worker activating...");

  (event as ExtendableEvent).waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete old cache versions
            return (
              cacheName.startsWith("essential-cache-") &&
              cacheName !== "essential-cache-v1"
            );
          })
          .map((cacheName) => caches.delete(cacheName)),
      );
    }),
  );
});

// Message handler for communication with main thread
self.addEventListener("message", (event: Event) => {
  const messageEvent = event as ExtendableMessageEvent;
  console.log("[SW] Message received:", messageEvent.data);

  if (messageEvent.data && messageEvent.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (messageEvent.data && messageEvent.data.type === "GET_VERSION") {
    messageEvent.ports[0].postMessage({ version: "1.0.0" });
  }
});

// Initialize Serwist
serwist.addEventListeners();
