/** The system prompts: each library's own prompt for the shared catalog. */
import { formatGenUiPrompt } from "ingenui/server";

import { genUiSchema, jsonRenderCatalog } from "./catalogs.ts";
import type { Format } from "./evaluate.ts";

/**
 * ingenui ≤ 0.0.2's prompt told the model "Output raw JSX only — no prose,
 * no markdown code fences" inside its own Markdown + ui+jsx format (fixed
 * in uhyo/ingenui by `formatPromptContract`'s `standalone: false`). Until
 * the fix is published, apply the same change to the published prompt so
 * the experiment measures the fixed one. Remove once ingenui > 0.0.2.
 */
export function withEmbeddedContract(prompt: string): string {
  return prompt.replace(
    "Generate the UI as JSX, using only the subset described below.\n" +
      "Output raw JSX only — no prose, no markdown code fences, no imports, no statements.",
    "Write the UI as JSX, using only the subset described below.\n" +
      "Inside a UI block, write only JSX — no nested code fences, no imports, no statements.",
  );
}

/** Like ingenui's demo server: a short role line, then the library's prompt. */
const ingenuiSystem = `You are an assistant that answers by showing UI. Answer in Markdown: show what the user asks for in a ui+jsx block, and wire buttons to actions. Keep prose to one short sentence.

${withEmbeddedContract(formatGenUiPrompt(genUiSchema))}`;

/** json-render's prompt is self-contained (it starts with its own role line). */
const jsonRenderSystem = jsonRenderCatalog.prompt();

export const systemPrompts: Record<Format, string> = {
  ingenui: ingenuiSystem,
  "json-render": jsonRenderSystem,
};
