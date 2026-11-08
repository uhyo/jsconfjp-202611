/**
 * Vite plugin: `import slides from "./slides.md"` gives the deck as an array
 * of slides, each compiled with MDX (so slides can use React components —
 * the demos — inline) and highlighted with Shiki at build time.
 *
 * Each slide is its own virtual module (`slides.md?slide=N`), so one broken
 * slide shows an error in place instead of breaking the deck. Editing the
 * file hot-updates the deck without a reload (the deck module self-accepts
 * and hands the new slides to the app).
 */
import { readFile } from "node:fs/promises";

import { compile } from "@mdx-js/mdx";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import {
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import remarkGfm from "remark-gfm";
import { createHighlighter } from "shiki";
import type { Plugin } from "vite";

import { type RawSlide, splitSlides } from "./split.ts";

const DECK = /\.md$/;
const SLIDE_QUERY = /\?slide=(\d+)$/;

const LANGS = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "jsonl",
  "md",
  "mdx",
  "html",
  "css",
  "sh",
  "diff",
  "yaml",
] as const;

let highlighter: ReturnType<typeof createHighlighter> | undefined;
function getHighlighter() {
  highlighter ??= createHighlighter({
    themes: ["github-light"],
    langs: [...LANGS],
    // ```ui+jsx is ingenui's fence for UI.
    langAlias: { "ui+jsx": "jsx" },
  });
  return highlighter;
}

async function compileSlide(slide: RawSlide, file: string): Promise<string> {
  const result = await compile(
    { value: slide.body, path: file },
    {
      // Always MDX: `format: "detect"` would treat a `.md` path as plain
      // Markdown and drop all JSX.
      format: "mdx",
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        [
          rehypeShikiFromHighlighter,
          await getHighlighter(),
          {
            theme: "github-light",
            defaultLanguage: "text",
            fallbackLanguage: "text",
            addLanguageClass: true,
            transformers: [
              transformerNotationHighlight(),
              transformerNotationFocus(),
              transformerNotationDiff(),
            ],
          },
        ],
      ],
    },
  );
  return String(result);
}

function errorModule(error: unknown, slide: RawSlide, file: string): string {
  const message = `${file}:${slide.line}\n${error instanceof Error ? error.message : String(error)}`;
  return `import { jsx } from "react/jsx-runtime";
export default function SlideError() {
  return jsx("pre", { className: "slide-error", children: ${JSON.stringify(message)} });
}`;
}

export function slides(): Plugin {
  let isBuild = false;
  return {
    name: "jsconfjp-slides",
    enforce: "pre",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    // The deck module imports its slides by absolute path + query.
    resolveId(source) {
      if (SLIDE_QUERY.test(source) && DECK.test(source.replace(SLIDE_QUERY, ""))) return source;
      return null;
    },
    async load(id) {
      const slideMatch = SLIDE_QUERY.exec(id);
      const file = id.replace(SLIDE_QUERY, "");
      if (!DECK.test(file)) return null;
      this.addWatchFile(file);
      const deck = splitSlides(await readFile(file, "utf8"));

      if (slideMatch) {
        const slide = deck[Number(slideMatch[1])];
        if (!slide) return "export default function Missing() { return null; }";
        try {
          return await compileSlide(slide, file);
        } catch (error) {
          if (isBuild) throw error;
          this.warn(`slide at line ${slide.line}: ${String(error)}`);
          return errorModule(error, slide, file);
        }
      }

      const imports = deck
        .map((_, i) => `import Slide${i} from ${JSON.stringify(`${file}?slide=${i}`)};`)
        .join("\n");
      const entries = deck
        .map(
          (slide, i) =>
            `{ Component: Slide${i}, frontmatter: ${JSON.stringify(slide.frontmatter)}, ` +
            `notes: ${JSON.stringify(slide.notes)}, title: ${JSON.stringify(slide.title)}, ` +
            `line: ${slide.line} }`,
        )
        .join(",\n  ");
      return `${imports}
const slides = [
  ${entries}
];
export default slides;
if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    if (mod) window.dispatchEvent(new CustomEvent("slides:update", { detail: mod.default }));
  });
}
`;
    },
  };
}
