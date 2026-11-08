import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { slides } from "./plugins/slides.ts";

export default defineConfig({
  // Relative asset URLs, so the built deck can be served from any sub-path
  // (e.g. GitHub Pages).
  base: "./",
  plugins: [slides(), react()],
});
