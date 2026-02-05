module.exports = {
  globDirectory: 'dist/',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,jpeg,gif,svg,woff,woff2,ttf,ico}'
  ],
  swDest: 'dist/service-worker.js',

  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: ({ request }) => request.destination === 'image',
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: ({ request }) => request.destination === 'font',
      handler: 'CacheFirst',
      options: {
        cacheName: 'font-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
  ],

  navigateFallback: '/index.html',
  navigateFallbackDenylist: [
    /^\/api/,           // API routes should hit the network
    /\/_expo\/static/,  // Expo static files
    /\?.*session_token/, // OAuth callback with session token
    /\?.*code=/,        // OAuth callback with authorization code
    /\?.*state=/,       // OAuth callback with state parameter
  ],
  skipWaiting: true,
  clientsClaim: true,
};
