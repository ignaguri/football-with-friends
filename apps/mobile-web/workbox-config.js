module.exports = {
  globDirectory: "dist/",
  globPatterns: ["**/*.{html,js,css,png,jpg,jpeg,gif,svg,woff,woff2,ttf,ico}"],
  // Use InjectManifest for custom service worker with logging
  swSrc: "src/service-worker.js",
  swDest: "dist/service-worker.js",
};
