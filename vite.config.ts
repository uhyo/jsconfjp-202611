import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { slides } from "./plugins/slides.ts";

export default defineConfig(({ command, mode }) => {
  // `<ClaudeChatDemo>` talks to the server of ingenui's demo app
  // (`apps/demo` in uhyo/ingenui): the deployed Worker, or `pnpm dev` of
  // that app. Set its origin in `.env.local`, the shell, or CI:
  //
  //   INGENUI_DEMO_URL=https://ingenui-demo.<account>.workers.dev
  //
  // - `vite dev` / `vite preview`: `/api/*` is proxied there (same-origin,
  //   so any server works — no CORS needed).
  // - `vite build`: the URL is built in and the page calls the server
  //   directly, which needs the page's origin in the Worker's
  //   `ALLOWED_ORIGINS` (it lists the GitHub Pages origin).
  const env = loadEnv(mode, process.cwd(), "");
  const target = (process.env.INGENUI_DEMO_URL ?? env.INGENUI_DEMO_URL)?.replace(/\/+$/, "");
  const proxy = target ? { "/api": { target, changeOrigin: true } } : undefined;

  return {
    // Relative asset URLs, so the built deck can be served from any sub-path
    // (e.g. GitHub Pages).
    base: "./",
    plugins: [slides(), react()],
    define: {
      __INGENUI_API_ORIGIN__: JSON.stringify(command === "build" ? (target ?? "") : ""),
    },
    server: { proxy },
    preview: { proxy },
  };
});
