/* eslint-disable no-restricted-globals */
// Import Workbox from CDN (ES6 imports don't work in service workers)
importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js");

const { clientsClaim } = workbox.core;
const { precacheAndRoute, createHandlerBoundToURL } = workbox.precaching;
const { registerRoute, NavigationRoute } = workbox.routing;
const { NetworkFirst, CacheFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

// Log service worker lifecycle
console.log("[SW] 🔵 Service Worker initializing");

// Take control of all pages immediately
clientsClaim();
self.skipWaiting();

console.log("[SW] ⚡ Skip waiting and client claim enabled");

// Precache all assets (manifest will be injected by Workbox)
precacheAndRoute(self.__WB_MANIFEST || []);
console.log("[SW] 📦 Precached assets loaded");

// API caching strategy
registerRoute(
  ({ url }) => {
    const matches = url.pathname.startsWith("/api/");
    if (matches) {
      console.log("[SW] 🌐 API route matched:", url.href);
    }
    return matches;
  },
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
      {
        fetchDidSucceed: async ({ response }) => {
          console.log("[SW] ✅ API fetch succeeded");
          return response;
        },
        fetchDidFail: async ({ originalRequest }) => {
          console.log("[SW] ❌ API fetch failed:", originalRequest.url);
        },
      },
    ],
  }),
);

// Image caching strategy
registerRoute(
  ({ request }) => {
    const matches = request.destination === "image";
    if (matches) {
      console.log("[SW] 🖼️  Image route matched:", request.url);
    }
    return matches;
  },
  new CacheFirst({
    cacheName: "image-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
);

// Font caching strategy
registerRoute(
  ({ request }) => {
    const matches = request.destination === "font";
    if (matches) {
      console.log("[SW] 🔤 Font route matched:", request.url);
    }
    return matches;
  },
  new CacheFirst({
    cacheName: "font-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  }),
);

// Navigation route with denylist for OAuth
const handler = createHandlerBoundToURL("/index.html");
const denylist = [
  /^\/api/, // API routes should hit the network
  /\/_expo\/static/, // Expo static files
  /\?.*session_token/, // OAuth callback with session token
  /\?.*code=/, // OAuth callback with authorization code
  /\?.*state=/, // OAuth callback with state parameter
];

// Custom navigation route handler with logging
const navigationRoute = new NavigationRoute(
  ({ event, url }) => {
    console.log("[SW] 🧭 Navigation request:", {
      url: url.href,
      pathname: url.pathname,
      search: url.search,
      destination: event.request.destination,
      mode: event.request.mode,
    });

    // Check denylist
    const pathname = url.pathname + url.search;
    for (const pattern of denylist) {
      if (pattern.test(pathname)) {
        console.log("[SW] 🚫 Navigation DENIED by denylist:", pattern.toString());
        console.log("[SW] ⏭️  Passing through to network");
        return fetch(event.request);
      }
    }

    console.log("[SW] ✅ Navigation allowed, serving app shell");
    return handler({ event, url });
  },
  {
    denylist,
  },
);

registerRoute(navigationRoute);
console.log(
  "[SW] 🗺️  Navigation route registered with denylist:",
  denylist.map((r) => r.toString()),
);

// Fetch event logging
self.addEventListener("fetch", (event) => {
  // Only log navigations to avoid spam
  if (event.request.mode === "navigate") {
    console.log("[SW] 📡 Fetch event (navigate):", {
      url: event.request.url,
      method: event.request.method,
      destination: event.request.destination,
      mode: event.request.mode,
    });
  }
});

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] 📥 Installing new service worker");
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] 🎯 Service worker activated");
});

console.log("[SW] ✨ Service Worker setup complete");
