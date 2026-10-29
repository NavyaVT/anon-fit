import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The API is reached through this dev server, not cross-origin from the browser.
 * That keeps a single forwarded port working in remote IDEs / tunnels and avoids
 * CORS + mixed-content issues entirely.
 */
const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8010";

const proxy = {
  "/api": {
    target: API_TARGET,
    changeOrigin: false,
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Vite 6 rejects unknown Host headers. These cover VS Code dev tunnels and
    // hosted IDEs; add your own tunnel domain here if it differs.
    allowedHosts: [".devtunnels.ms", ".app.github.dev", ".github.dev", "localhost"],
    proxy,
  },
  // `npm run preview` serves the production build with the same proxy rules.
  preview: {
    port: 4173,
    host: true,
    proxy,
  },
});
