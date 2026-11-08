/**
 * Components available in every slide without importing them — write
 * `<CompareDemo />` straight in `slides.md`. (Slides can also `import`
 * anything else, relative to `slides.md`.)
 */
import type { MDXComponents } from "mdx/types";

import { CompareDemo } from "./demos/CompareDemo";
import { GenUiMessageDemo } from "./demos/GenUiMessageDemo";
import { JsonRenderDemo } from "./demos/JsonRenderDemo";
import { JsxStreamDemo } from "./demos/JsxStreamDemo";
import { PromptCompare } from "./demos/PromptCompare";
import { Box, Columns } from "./deck/helpers";

export const mdxComponents: MDXComponents = {
  // Layout helpers
  Columns,
  Box,
  // Demos
  JsxStreamDemo,
  GenUiMessageDemo,
  JsonRenderDemo,
  CompareDemo,
  PromptCompare,
};
