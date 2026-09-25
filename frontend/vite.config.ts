import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

const basePath = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      manifest: {
        name: "GTF - Controle de Almoços",
        short_name: "GTF Almoço",
        start_url: `${basePath}colaborador/`,
        scope: `${basePath}colaborador/`,
        display: "standalone",
        background_color: "#EFF8F7",
        theme_color: "#1E8C86",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        // API nunca cacheada: só documentos do portal.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/api/"),
            handler: "NetworkOnly"
          }
        ]
      },
      injectManifest: { globPatterns: ["**/*.{js,css,html,ico,png,webmanifest}"] }
    })
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  base: process.env.VITE_BASE_PATH ?? "/",
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          radix: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-label",
            "@radix-ui/react-slot",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-select",
            "@radix-ui/react-separator"
          ],
          charts: ["recharts"],
          sheet: ["xlsx"],
          calendar: ["react-day-picker", "date-fns"],
          notify: ["sonner"]
        }
      }
    }
  },
  server: {
    port: 5173,
    watch: {
      usePolling: false,
      ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"]
    }
  }
});
