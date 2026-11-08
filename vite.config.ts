import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { slides } from "./plugins/slides.ts";

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Where the ingenui monorepo lives. The demos run against ingenui's *source*
 * (like ingenui's own `apps/demo`), so the slides always show the latest
 * code without a build or a release. Looked up in order:
 *
 * 1. `$INGENUI_DIR`
 * 2. `./vendor/ingenui` (e.g. a git submodule)
 * 3. `../ingenui` (a sibling checkout)
 */
function findIngenui(): string {
  const candidates = [
    process.env.INGENUI_DIR,
    resolve(root, "vendor/ingenui"),
    resolve(root, "../ingenui"),
  ].filter((dir): dir is string => Boolean(dir));
  for (const dir of candidates) {
    if (existsSync(resolve(dir, "packages/ingenui/src/index.ts"))) return resolve(dir);
  }
  throw new Error(
    `ingenui source not found (looked in: ${candidates.join(", ")}).\n` +
      "Clone https://github.com/uhyo/ingenui next to this repository, add it as a " +
      "submodule at vendor/ingenui, or set INGENUI_DIR.",
  );
}

const ingenui = findIngenui();
const parserSrc = resolve(ingenui, "packages/incremental-jsx-parser/src");
const ingenuiSrc = resolve(ingenui, "packages/ingenui/src");

export default defineConfig({
  // Relative asset URLs, so the built deck can be served from any sub-path
  // (e.g. GitHub Pages).
  base: "./",
  plugins: [slides(), react()],
  resolve: {
    alias: [
      { find: /^@ingenui\/incremental-jsx-parser\/react$/, replacement: `${parserSrc}/react.ts` },
      { find: /^@ingenui\/incremental-jsx-parser\/core$/, replacement: `${parserSrc}/core.ts` },
      { find: /^@ingenui\/incremental-jsx-parser$/, replacement: `${parserSrc}/index.ts` },
      { find: /^ingenui\/react$/, replacement: `${ingenuiSrc}/react.ts` },
      { find: /^ingenui\/schema$/, replacement: `${ingenuiSrc}/schema.ts` },
      { find: /^ingenui\/server$/, replacement: `${ingenuiSrc}/server.ts` },
      { find: /^ingenui$/, replacement: `${ingenuiSrc}/index.ts` },
    ],
    // The aliased source lives outside this project and imports `react`
    // itself; make sure it gets this project's single copy.
    dedupe: ["react", "react-dom"],
  },
  server: {
    fs: { allow: [root, ingenui] },
  },
});
