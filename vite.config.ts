import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Ask before swapping in a new version so nobody loses an open edit.
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Personal Tracker",
        short_name: "Tracker",
        description: "Không gian làm việc cá nhân: dự án, task, ghi chú, Focus — chạy offline, dữ liệu trong trình duyệt.",
        lang: "vi",
        start_url: "/#/today",
        scope: "/",
        display: "standalone",
        background_color: "#e9ece6",
        theme_color: "#e9ece6",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Hôm nay", url: "/#/today" },
          { name: "Inbox", url: "/#/inbox" },
          { name: "Ghi chú", url: "/#/notes" },
        ],
      },
      workbox: {
        // The app shell + lazy chunks; old photo backgrounds stay out of the cache.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-css" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/www\.google\.com\/s2\/favicons/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "bookmark-favicons",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
