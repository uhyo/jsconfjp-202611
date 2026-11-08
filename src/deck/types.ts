import type { MDXComponents } from "mdx/types";
import type { ComponentType } from "react";

export type LayoutName = "default" | "cover" | "section" | "center" | "demo" | "blank";

/** Per-slide YAML frontmatter. Unknown keys are kept (and ignored). */
export interface SlideFrontmatter {
  /** The slide's layout (default: `"default"`). */
  layout?: LayoutName;
  /** Extra class names on the slide root (see `deck.css` for utilities). */
  class?: string;
  /** Show the page number (default: `true`, except on `cover`). */
  pageNumber?: boolean;
  /** Title for the overview/presenter views (default: the first `# heading`). */
  title?: string;
  [key: string]: unknown;
}

/** One slide, as produced by `plugins/slides.ts`. */
export interface Slide {
  Component: ComponentType<{ components?: MDXComponents }>;
  frontmatter: SlideFrontmatter;
  notes: string;
  title: string;
  /** Line in the deck file where the slide starts. */
  line: number;
}

/**
 * Where a slide is being rendered.
 *
 * - `main`: the audience view — demos are interactive.
 * - `preview`: thumbnails (overview, presenter) — demos show their final
 *   state without animating.
 * - `print`: every slide, for PDF export — same as `preview`.
 */
export type RenderMode = "main" | "preview" | "print";
