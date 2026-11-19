/** The system prompts: each library's own prompt for the shared catalog. */
import { formatGenUiPrompt } from "ingenui/server";

import { genUiSchema, jsonRenderCatalog } from "./catalogs.ts";
import type { Format } from "./evaluate.ts";

/** Like ingenui's demo server: a short role line, then the library's prompt. */
const ingenuiSystem = `You are an assistant that answers by showing UI. Answer in Markdown: show what the user asks for in a ui+jsx block, and wire buttons to actions. Keep prose to one short sentence.

${formatGenUiPrompt(genUiSchema)}`;

/** json-render's prompt is self-contained (it starts with its own role line). */
const jsonRenderSystem = jsonRenderCatalog.prompt();

export const systemPrompts: Record<Format, string> = {
  ingenui: ingenuiSystem,
  "json-render": jsonRenderSystem,
};
