/**
 * Runs the generation experiment against the Claude API and logs every
 * response (graded) to results/runs.jsonl. Resumable: trials already in the
 * log are skipped, so re-running with more --trials only adds new ones.
 *
 *   ANTHROPIC_API_KEY=… node experiments/run.ts [--conditions haiku-nothink,haiku-low]
 *     [--tasks product,dashboard] [--formats ingenui,json-render] [--trials 5]
 *     [--concurrency 4]
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";

import { conditions, type Condition } from "./conditions.ts";
import { grade, type Format, type Grade } from "./evaluate.ts";
import { systemPrompts } from "./prompts.ts";
import { tasks, type Task } from "./tasks.ts";

const here = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(here, "results");
const logPath = join(resultsDir, "runs.jsonl");

export interface RunRecord {
  condition: string;
  model: string;
  effort: string;
  thinking: boolean;
  format: Format;
  task: string;
  trial: number;
  stopReason: string | null;
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number };
  ms: number;
  text: string;
  grade: Grade;
  at: string;
}

const { values } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== "--"),
  options: {
    conditions: { type: "string", default: conditions.map((c) => c.id).join(",") },
    tasks: { type: "string", default: tasks.map((t) => t.id).join(",") },
    formats: { type: "string", default: "ingenui,json-render" },
    trials: { type: "string", default: "5" },
    concurrency: { type: "string", default: "4" },
  },
});

const pick = <T extends { id: string }>(all: readonly T[], ids: string): T[] =>
  ids.split(",").map((id) => {
    const found = all.find((x) => x.id === id);
    if (!found) throw new Error(`unknown id ${id}; have ${all.map((x) => x.id).join(", ")}`);
    return found;
  });

const selected = {
  conditions: pick(conditions, values.conditions!),
  tasks: pick(tasks, values.tasks!),
  formats: values.formats!.split(",") as Format[],
  trials: Number(values.trials),
};

mkdirSync(resultsDir, { recursive: true });
const done = new Set<string>();
if (existsSync(logPath)) {
  for (const line of readFileSync(logPath, "utf8").split("\n")) {
    if (!line) continue;
    const r = JSON.parse(line) as RunRecord;
    done.add(keyOf(r.condition, r.format, r.task, r.trial));
  }
}

function keyOf(condition: string, format: string, task: string, trial: number) {
  return `${condition}/${format}/${task}/${trial}`;
}

interface Job {
  condition: Condition;
  format: Format;
  task: Task;
  trial: number;
}
const jobs: Job[] = [];
for (let trial = 0; trial < selected.trials; trial++) {
  for (const condition of selected.conditions) {
    for (const task of selected.tasks) {
      for (const format of selected.formats) {
        if (!done.has(keyOf(condition.id, format, task.id, trial))) jobs.push({ condition, format, task, trial });
      }
    }
  }
}
console.log(`${jobs.length} requests to run (${done.size} already logged)`);

// Always the public API: a container may set ANTHROPIC_BASE_URL for something else.
const client = new Anthropic({ baseURL: process.env.EXPERIMENT_BASE_URL ?? "https://api.anthropic.com", maxRetries: 6 });

async function runJob({ condition, format, task, trial }: Job): Promise<void> {
  const started = performance.now();
  const response = await client.messages.create({
    model: condition.model,
    max_tokens: 16000,
    system: systemPrompts[format],
    messages: [{ role: "user", content: task.prompt }],
    output_config: { effort: condition.effort },
    ...(condition.thinking ? {} : { thinking: { type: "disabled" as const } }),
  });
  const ms = Math.round(performance.now() - started);
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const record: RunRecord = {
    condition: condition.id,
    model: condition.model,
    effort: condition.effort,
    thinking: condition.thinking,
    format,
    task: task.id,
    trial,
    stopReason: response.stop_reason,
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
      cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
    },
    ms,
    text,
    grade: await grade(format, text, task),
    at: new Date().toISOString(),
  };
  appendFileSync(logPath, `${JSON.stringify(record)}\n`);
  const mark = record.grade.success ? "ok  " : record.grade.valid ? "miss" : "FAIL";
  console.log(
    `${mark} ${keyOf(condition.id, format, task.id, trial)} out=${record.usage.output} ${ms}ms` +
      (record.grade.success ? "" : ` ${[...record.grade.problems, ...record.grade.missingFacts.map((f) => `missing ${f}`), ...record.grade.missingActions.map((a) => `unwired ${a}`)].slice(0, 3).join(" | ")}`),
  );
}

let next = 0;
let failures = 0;
async function worker() {
  while (next < jobs.length) {
    const job = jobs[next++]!;
    try {
      await runJob(job);
    } catch (error) {
      failures++;
      const where = keyOf(job.condition.id, job.format, job.task.id, job.trial);
      if (error instanceof Anthropic.APIError) console.error(`ERR  ${where}: ${error.status} ${error.message}`);
      else console.error(`ERR  ${where}:`, error);
    }
  }
}
await Promise.all(Array.from({ length: Number(values.concurrency) }, worker));
console.log(`done; ${failures} request(s) failed (not logged — re-run to retry)`);
