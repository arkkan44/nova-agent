import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // "autoUpdate" : le SW se met à jour silencieusement en arrière-plan
      registerType: "autoUpdate",

      // Le SW est inclus dans le build
      injectRegister: "auto",

      // Fichiers à précacher (générés automatiquement + les tiens)
      includeAssets: [
        "favicon.ico",
        "icons/*.png",
        "fonts/**/*",
      ],

      // ─── Manifest ───────────────────────────────────────────
      manifest: {
        name: "NOVA — Guide de Conscience",
        short_name: "NOVA",
        description: "Ton guide spirituel et psychologique personnel.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#050208",
        theme_color: "#d4a84b",
        lang: "fr",
        icons: [
          { src: "/icons/icon-72x72.png",   sizes: "72x72",   type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-96x96.png",   sizes: "96x96",   type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable any" },
        ],
        shortcuts: [
          {
            name: "Méditation",
            url: "/meditation",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
          },
          {
            name: "Vocal",
            url: "/vocal",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
          },
        ],
      },

      // ─── Workbox (stratégies de cache) ──────────────────────
      workbox: {
        // Précacher automatiquement tous les assets du build
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        // Stratégies réseau
        runtimeCaching: [
          // API NOVA → NetworkFirst (toujours fraîche)
          {
            urlPattern: /^https:\/\/nova-agent-production-8bcc\.up\.railway\.app/,
            handler: "NetworkFirst",
            options: {
              cacheName: "nova-api-cache",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }, // 5 min
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase → NetworkFirst
          {
            urlPattern: /^https:\/\/.*\.supabase\.co/,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 }, // 1h
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts → CacheFirst
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 an
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ElevenLabs / audio → NetworkFirst (pas de cache audio lourd)
          {
            urlPattern: /^https:\/\/api\.elevenlabs\.io/,
            handler: "NetworkOnly",
          },
        ],

        // Page offline de fallback
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/admin/],
      },

      // ─── Dev options ─────────────────────────────────────────
      devOptions: {
        enabled: true,        // Activer le SW en développement
        type: "module",
      },
    }),
  ],

  server: {
    port: 5173,
    host: true,
  },
});
