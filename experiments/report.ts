/**
 * Aggregates results/runs.jsonl (+ token counts from count.ts) into
 * results/summary.json and results/summary.md. Offline: no API calls.
 *
 *   node experiments/report.ts [--model claude-haiku-5-5]   (the count.ts model)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { jsx, specs } from "../src/demos/samples.ts";
import { conditions, pricing } from "./conditions.ts";
import { jsxToSpecStream } from "./convert.ts";
import { extractJsxBlocks, type Format } from "./evaluate.ts";
import { systemPrompts } from "./prompts.ts";
import type { RunRecord } from "./run.ts";
import { loadTokenCache, tokenKey } from "./token-cache.ts";
import { tasks } from "./tasks.ts";

const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== "--"),
  options: { model: { type: "string", default: "claude-haiku-5-5" } },
});
const cache = loadTokenCache();
const tok = (text: string): number | undefined => cache[tokenKey(values.model!, text)];

const logPath = join(here, "results", "runs.jsonl");
const runs: RunRecord[] = existsSync(logPath)
  ? readFileSync(logPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as RunRecord)
  : [];

const FORMATS: Format[] = ["ingenui", "json-render"];
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : NaN);
const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
/** Wilson 95% interval. */
const wilson = (k: number, n: number): [number, number] => {
  if (n === 0) return [NaN, NaN];
  const z = 1.96;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - r) / d, (c + r) / d];
};
const pct = (x: number) => (Number.isNaN(x) ? "–" : `${(x * 100).toFixed(0)}%`);
const num = (x: number | undefined, digits = 0) => (x === undefined || Number.isNaN(x) ? "–" : x.toFixed(digits));
const cost = (r: RunRecord) => {
  const p = pricing[r.model]!;
  return (r.usage.input * p.input + r.usage.output * p.output) / 1e6;
};

// 1. Static comparisons
const staticTokens = {
  systemPrompt: {
    ingenui: { chars: systemPrompts.ingenui.length, tokens: tok(systemPrompts.ingenui) },
    "json-render": { chars: systemPrompts["json-render"].length, tokens: tok(systemPrompts["json-render"]) },
  },
  productSample: {
    jsx: { chars: jsx.product.length, tokens: tok(jsx.product) },
    specStream: { chars: specs.product.length, tokens: tok(specs.product) },
  },
};

// 2. Same UI, two notations: every valid ingenui block, converted.
const sameUi: { task: string; condition: string; jsx: number; spec: number }[] = [];
for (const r of runs) {
  if (r.format !== "ingenui" || !r.grade.valid) continue;
  for (const block of extractJsxBlocks(r.text)) {
    const converted = jsxToSpecStream(block);
    const a = tok(block);
    const b = converted ? tok(converted) : undefined;
    if (a !== undefined && b !== undefined) sameUi.push({ task: r.task, condition: r.condition, jsx: a, spec: b });
  }
}
const sameUiSummary = {
  blocks: sameUi.length,
  jsxTokens: sum(sameUi.map((x) => x.jsx)),
  specTokens: sum(sameUi.map((x) => x.spec)),
  ratio: sum(sameUi.map((x) => x.spec)) / sum(sameUi.map((x) => x.jsx)),
  byTask: Object.fromEntries(
    tasks.map((t) => {
      const xs = sameUi.filter((x) => x.task === t.id);
      return [t.id, { blocks: xs.length, jsx: mean(xs.map((x) => x.jsx)), spec: mean(xs.map((x) => x.spec)) }];
    }),
  ),
};

// 2b. Actual vs actual: the UI part of every successful response, per format
// (each format's own output for the same request — what you really pay,
// including json-render's repeat/state shortcuts).
const actualTokens = (format: Format, task?: string) =>
  runs
    .filter((r) => r.format === format && r.grade.success && (task === undefined || r.task === task))
    .map((r) => tok(r.grade.uiText))
    .filter((x): x is number => x !== undefined);
const actualUi = {
  responses: Object.fromEntries(FORMATS.map((f) => [f, actualTokens(f).length])),
  mean: Object.fromEntries(FORMATS.map((f) => [f, mean(actualTokens(f))])),
  ratio: mean(actualTokens("json-render")) / mean(actualTokens("ingenui")),
  byTask: Object.fromEntries(
    tasks.map((t) => [
      t.id,
      {
        ingenui: mean(actualTokens("ingenui", t.id)),
        "json-render": mean(actualTokens("json-render", t.id)),
      },
    ]),
  ),
};

// 3. Generation: success rate, tokens, latency, cost per condition × format
interface Cell {
  condition: string;
  format: Format;
  n: number;
  success: number;
  valid: number;
  content: number;
  successCI: [number, number];
  uiTokensMedian: number;
  outputTokensMean: number;
  inputTokensMean: number;
  latencyMsMedian: number;
  costPerRequest: number;
  costPerSuccess: number;
  stopReasons: Record<string, number>;
  topProblems: [string, number][];
}

/** Groups problems by kind (drops element keys / specifics). */
function normalizeProblem(p: string): string {
  return p
    .replace(/^props: [^(]*\(([^)]*)\)\.([^:]*):.*/, "props: $1.$2")
    .replace(/^catalog: elements\.[^.]+\./, "catalog: elements.*.")
    .replace(/"[^"]*"/g, '"…"')
    .replace(/<[A-Za-z][^>]*>/g, "<…>")
    .replace(/\{[^}]*\}/g, "{…}")
    .slice(0, 90);
}

const cells: Cell[] = [];
for (const c of conditions) {
  for (const format of FORMATS) {
    const rs = runs.filter((r) => r.condition === c.id && r.format === format);
    if (!rs.length) continue;
    const k = rs.filter((r) => r.grade.success).length;
    const problems = new Map<string, number>();
    for (const r of rs) {
      const labels = new Set([
        ...r.grade.problems.map(normalizeProblem),
        ...(r.grade.valid && !r.grade.content ? ["content: missing facts / unwired action"] : []),
      ]);
      for (const p of labels) problems.set(p, (problems.get(p) ?? 0) + 1);
    }
    const totalCost = sum(rs.map(cost));
    const stopReasons: Record<string, number> = {};
    for (const r of rs) stopReasons[String(r.stopReason)] = (stopReasons[String(r.stopReason)] ?? 0) + 1;
    cells.push({
      condition: c.id,
      format,
      n: rs.length,
      success: k / rs.length,
      valid: rs.filter((r) => r.grade.valid).length / rs.length,
      content: rs.filter((r) => r.grade.content).length / rs.length,
      successCI: wilson(k, rs.length),
      uiTokensMedian: median(rs.map((r) => tok(r.grade.uiText)).filter((x): x is number => x !== undefined)),
      outputTokensMean: mean(rs.map((r) => r.usage.output)),
      inputTokensMean: mean(rs.map((r) => r.usage.input)),
      latencyMsMedian: median(rs.map((r) => r.ms)),
      costPerRequest: totalCost / rs.length,
      costPerSuccess: k ? totalCost / k : NaN,
      stopReasons,
      topProblems: [...problems.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    });
  }
}

const perTask: Record<string, Record<string, Record<string, string>>> = {};
for (const c of conditions) {
  perTask[c.id] = {};
  for (const f of FORMATS) {
    perTask[c.id]![f] = {};
    for (const t of tasks) {
      const rs = runs.filter((r) => r.condition === c.id && r.format === f && r.task === t.id);
      perTask[c.id]![f]![t.id] = rs.length ? `${rs.filter((r) => r.grade.success).length}/${rs.length}` : "–";
    }
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  tokenModel: values.model,
  runs: runs.length,
  staticTokens,
  sameUi: sameUiSummary,
  actualUi,
  cells,
  perTask,
};
writeFileSync(join(here, "results", "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

// Markdown
const md: string[] = [];
md.push(`# json-render vs ingenui — experiment results`, "");
md.push(`${runs.length} responses. Token counts: count_tokens with ${values.model}.`, "");
md.push(`## System prompt (same catalog)`, "");
md.push(`| | chars | tokens |`, `|---|---:|---:|`);
for (const f of FORMATS) {
  md.push(`| ${f} | ${staticTokens.systemPrompt[f].chars} | ${num(staticTokens.systemPrompt[f].tokens)} |`);
}
md.push("", `## UI tokens of actual responses`, "");
md.push(
  `Successful responses (ingenui ${actualUi.responses.ingenui}, json-render ${actualUi.responses["json-render"]}), UI part only: ` +
    `ingenui ${num(actualUi.mean.ingenui)} vs json-render ${num(actualUi.mean["json-render"])} tokens on average — **×${num(actualUi.ratio, 2)}**.`,
  "",
);
md.push(`| task | ingenui (mean) | json-render (mean) | ratio |`, `|---|---:|---:|---:|`);
for (const [t, v] of Object.entries(actualUi.byTask)) {
  md.push(`| ${t} | ${num(v.ingenui)} | ${num(v["json-render"])} | ×${num(v["json-render"] / v.ingenui, 2)} |`);
}
md.push("", `## Same UI, two notations`, "");
md.push(
  `Slides' product sample: JSX ${num(staticTokens.productSample.jsx.tokens)} tokens vs SpecStream ` +
    `${num(staticTokens.productSample.specStream.tokens)} tokens.`,
  "",
);
md.push(
  `Real model output (${sameUiSummary.blocks} valid ui+jsx blocks, each converted to the equivalent SpecStream): ` +
    `JSX ${sameUiSummary.jsxTokens} tokens vs SpecStream ${sameUiSummary.specTokens} tokens — **×${num(sameUiSummary.ratio, 2)}**.`,
  "",
);
md.push(`| task | blocks | JSX (mean) | SpecStream (mean) | ratio |`, `|---|---:|---:|---:|---:|`);
for (const [t, v] of Object.entries(sameUiSummary.byTask)) {
  md.push(`| ${t} | ${v.blocks} | ${num(v.jsx)} | ${num(v.spec)} | ${v.blocks ? `×${num(v.spec / v.jsx, 2)}` : "–"} |`);
}
md.push("", `## Generation (each library's own prompt, same request)`, "");
md.push(
  `| condition | format | n | success | (95% CI) | valid | content | UI tokens (median) | output tokens (mean) | latency (median) | $/request | $/success |`,
  `|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|`,
);
for (const c of cells) {
  md.push(
    `| ${c.condition} | ${c.format} | ${c.n} | **${pct(c.success)}** | ${pct(c.successCI[0])}–${pct(c.successCI[1])} | ` +
      `${pct(c.valid)} | ${pct(c.content)} | ${num(c.uiTokensMedian)} | ${num(c.outputTokensMean)} | ` +
      `${(c.latencyMsMedian / 1000).toFixed(1)}s | $${c.costPerRequest.toFixed(5)} | ` +
      `${Number.isNaN(c.costPerSuccess) ? "–" : `$${c.costPerSuccess.toFixed(5)}`} |`,
  );
}
md.push("", `### Failure reasons (responses affected)`, "");
for (const c of cells) {
  if (!c.topProblems.length) continue;
  md.push(`- **${c.condition} / ${c.format}**: ${c.topProblems.map(([p, n]) => `${p} (${n})`).join("; ")}`);
}
md.push("", `### Success per task`, "");
md.push(`| condition | format | ${tasks.map((t) => t.id).join(" | ")} |`, `|---|---|${tasks.map(() => "---:").join("|")}|`);
for (const c of conditions) {
  for (const f of FORMATS) {
    const row = perTask[c.id]![f]!;
    if (Object.values(row).every((v) => v === "–")) continue;
    md.push(`| ${c.id} | ${f} | ${tasks.map((t) => row[t.id]).join(" | ")} |`);
  }
}
writeFileSync(join(here, "results", "summary.md"), `${md.join("\n")}\n`);
console.log(md.join("\n"));
