import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  base: process.env.VITE_BASE_PATH ?? "/",
  build: {
    chunkSizeWarningLimit: 600,
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
