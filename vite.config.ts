import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { slides } from "./plugins/slides.ts";

export default defineConfig(({ mode }) => {
  // `<ClaudeChatDemo>` talks to the server of ingenui's demo app
  // (`apps/demo` in uhyo/ingenui): the deployed Worker, or `pnpm dev` of
  // that app. Set its origin in `.env.local` (or the shell):
  //
  //   INGENUI_DEMO_URL=https://ingenui-demo.<account>.workers.dev
  //
  // `/api/*` is proxied there, so the browser stays same-origin (the Worker
  // sends no CORS headers). Works in `vite dev` and `vite preview`.
  const env = loadEnv(mode, process.cwd(), "");
  const target = process.env.INGENUI_DEMO_URL ?? env.INGENUI_DEMO_URL;
  const proxy = target ? { "/api": { target, changeOrigin: true } } : undefined;

  return {
    // Relative asset URLs, so the built deck can be served from any sub-path
    // (e.g. GitHub Pages).
    base: "./",
    plugins: [slides(), react()],
    server: { proxy },
    preview: { proxy },
  };
});
