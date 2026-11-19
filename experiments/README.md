# json-render vs ingenui experiments

Real-Claude measurements behind the comparison slides: how many tokens the
same UI takes in each notation, and how often a model (cheap ones included)
produces a UI that is valid and shows what was asked.

## Setup

- **Catalog** (`catalogs.ts`): the same 13 components, props, descriptions
  and 5 actions declared for both libraries. Text is JSX children in ingenui
  and a `text` / `label` prop in json-render (a JSON spec has no text
  children). `tone` / `variant` are plain strings on both sides, since
  ingenui's prop types have no string enums.
- **Prompts** (`prompts.ts`): each library's own system prompt for that
  catalog, `formatGenUiPrompt(schema)` (after a one-line role) and
  `catalog.prompt()` (json-render's default `standalone` mode). The user
  message is the same for both. The ingenui prompt gets the fix for its
  "Output raw JSX only — no prose, no markdown code fences" line (it
  contradicted the Markdown + ui+jsx format) until that fix is published
  (`withEmbeddedContract`).
- **Tasks** (`tasks.ts`): 8 UI requests in Japanese that spell out all the
  data (product card, dashboard, profile, order status, weather, plan
  comparison, team list, incident report).
- **Conditions** (`conditions.ts`): Haiku 5.5 with thinking off, and Haiku
  5.5 / Sonnet 5.5 / Opus 5.5 at effort `low`. No server-side refusal
  fallback, so each row measures only the model it names.

## Grading (`evaluate.ts`)

- **valid**: the format's own checks pass. ingenui: no issues (the server
  validator plus the client's render errors) and at least one ui+jsx block.
  json-render: a non-empty spec that passes `validateSpec` and
  `catalog.validate`, plus two checks json-render leaves out, added because
  ingenui makes them at parse time: each element's props match its
  component's Zod schema (`$state`-style expressions allowed), and `on`
  bindings name existing actions.
- **content**: both UIs are rendered to HTML (`render.ts`, same minimal
  components). The rendered text must contain every expected fact of the
  task, and each required action must be wired to a button.
- **success** means valid and content.

## Token counts (`count.ts`, `convert.ts`)

Counts come from the Messages `count_tokens` API (Haiku 5.5's tokenizer),
minus the request's fixed overhead:

- both system prompts;
- the slides' hand-written product sample in both notations;
- the UI part of every response;
- **one UI written two ways**: every valid ui+jsx block from the runs is
  converted to the SpecStream that draws the same tree (`convert.ts`,
  json-render's `"metric-1"`-style keys), and both are counted.

## Run

```sh
pnpm exp:smoke                     # offline self-check of grader + converter
export ANTHROPIC_API_KEY=…
pnpm exp:run -- --conditions haiku-nothink,haiku-low --trials 20
pnpm exp:run -- --conditions sonnet-low,opus-low --trials 5
pnpm exp:count                     # token counts (free API calls)
pnpm exp:report                    # → results/summary.md, results/summary.json
```

`run.ts` appends every graded response to `results/runs.jsonl` and skips
trials already there, so it can be re-run to resume or to add trials.
Rough cost: about $0.25 for each Haiku condition at 20 trials; about $1.5
(Sonnet) and $3 (Opus) at 5 trials.
