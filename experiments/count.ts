/**
 * Token counts (Messages count_tokens API) for everything the report
 * compares, cached in results/tokens.json by model + text hash:
 *
 * - the two system prompts;
 * - the hand-written same-UI samples of the slides (samples.ts);
 * - for every logged response: its UI part (fence contents / JSONL), and
 *   for ingenui responses also the same UI converted to a SpecStream
 *   (convert.ts) — one UI, two notations, on real model output.
 *
 *   ANTHROPIC_API_KEY=… node experiments/count.ts [--model claude-haiku-5-5]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";

import { jsx, specs } from "../src/demos/samples.ts";
import { jsxToSpecStream } from "./convert.ts";
import { extractJsxBlocks } from "./evaluate.ts";
import { systemPrompts } from "./prompts.ts";
import type { RunRecord } from "./run.ts";
import { loadTokenCache, tokenCachePath as cachePath, tokenKey } from "./token-cache.ts";

const here = dirname(fileURLToPath(import.meta.url));
const logPath = join(here, "results", "runs.jsonl");

const { values } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== "--"),
  options: { model: { type: "string", default: "claude-haiku-5-5" } },
});
const model = values.model!;

const cache = loadTokenCache();
// Always the public API: a container may set ANTHROPIC_BASE_URL for something else.
const client = new Anthropic({ baseURL: process.env.EXPERIMENT_BASE_URL ?? "https://api.anthropic.com", maxRetries: 6 });

async function raw(text: string): Promise<number> {
  const k = tokenKey(`${model}#raw`, text);
  if (cache[k] === undefined) {
    const r = await client.messages.countTokens({ model, messages: [{ role: "user", content: text }] });
    cache[k] = r.input_tokens;
  }
  return cache[k]!;
}
/** Tokens of `text` itself: the count minus the request's fixed overhead. */
async function count(text: string): Promise<number> {
  const k = tokenKey(model, text);
  if (cache[k] === undefined) cache[k] = (await raw(text)) - ((await raw("a")) - 1);
  return cache[k]!;
}

const texts = new Set<string>([systemPrompts.ingenui, systemPrompts["json-render"], jsx.product, specs.product]);
for (const s of [jsx.product, jsx.dashboard]) {
  const converted = jsxToSpecStream(s);
  texts.add(s);
  if (converted) texts.add(converted);
}
if (existsSync(logPath)) {
  for (const line of readFileSync(logPath, "utf8").split("\n")) {
    if (!line) continue;
    const r = JSON.parse(line) as RunRecord;
    if (r.grade.uiText) texts.add(r.grade.uiText);
    if (r.format === "ingenui" && r.grade.valid) {
      for (const block of extractJsxBlocks(r.text)) {
        texts.add(block);
        const converted = jsxToSpecStream(block);
        if (converted) texts.add(converted);
      }
    }
  }
}

const todo = [...texts].filter((t) => cache[tokenKey(model, t)] === undefined);
console.log(`${texts.size} texts, ${todo.length} to count with ${model}`);
let next = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < todo.length) await count(todo[next++]!);
  }),
);
writeFileSync(cachePath, `${JSON.stringify(cache, null, 1)}\n`);
console.log(`system prompt: ingenui ${await count(systemPrompts.ingenui)}, json-render ${await count(systemPrompts["json-render"])}`);
console.log(`product sample: JSX ${await count(jsx.product)}, SpecStream ${await count(specs.product)}`);
