/**
 * Components available in every slide without importing them — write
 * `<CompareDemo />` straight in `slides.md`. (Slides can also `import`
 * anything else, relative to `slides.md`.)
 */
import type { MDXComponents } from "mdx/types";

import { ClaudeChatDemo } from "./demos/ClaudeChatDemo";
import { CompareDemo } from "./demos/CompareDemo";
import { ExperimentResults } from "./demos/ExperimentResults";
import { GenUiMessageDemo } from "./demos/GenUiMessageDemo";
import { JsonRenderDemo } from "./demos/JsonRenderDemo";
import { JsxStreamDemo } from "./demos/JsxStreamDemo";
import { JsxTreeDemo } from "./demos/JsxTreeDemo";
import { PromptCompare } from "./demos/PromptCompare";
import { Box, Columns } from "./deck/helpers";

export const mdxComponents: MDXComponents = {
  // Layout helpers
  Columns,
  Box,
  // Demos
  JsxStreamDemo,
  JsxTreeDemo,
  GenUiMessageDemo,
  JsonRenderDemo,
  CompareDemo,
  PromptCompare,
  ClaudeChatDemo,
  ExperimentResults,
};
