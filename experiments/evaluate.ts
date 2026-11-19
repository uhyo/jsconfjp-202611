/**
 * Grades one model response, the same way for both formats:
 *
 * - valid: the format's own checks pass (what the library would report).
 *   ingenui: no issues — the server validator's `jsx-error` /
 *   `unclosed-fence` plus the client's `render-error` — and at least one
 *   ui+jsx block. json-render: a non-empty spec whose tree is intact
 *   (`validateSpec`), that matches the catalog (`catalog.validate`), whose
 *   elements' props match their component's props schema (dynamic `$…`
 *   expressions allowed), and whose `on` bindings name existing actions.
 *   (json-render's own validators skip the last two; added for parity with
 *   ingenui, which checks props and action names at parse time.)
 * - content: the rendered text has every expected fact, and every required
 *   action is wired to something.
 * - success = valid && content.
 */
import { validateSpec, type Spec } from "@json-render/core";
import { validateGenUiMessage } from "ingenui/server";
import type { z } from "zod";

import { actionNames, genUiSchema, jsonRenderCatalog } from "./catalogs.ts";
import { compileSpec, htmlText, renderIngenui, renderJsonRender } from "./render.ts";
import type { Task } from "./tasks.ts";

export type Format = "ingenui" | "json-render";

export interface Grade {
  valid: boolean;
  content: boolean;
  success: boolean;
  /** Why it is not valid (empty when valid). */
  problems: string[];
  missingFacts: string[];
  missingActions: string[];
  /** The UI part of the response (fence contents / JSONL lines). */
  uiText: string;
  /** Visible text of the rendered UI. */
  renderedText: string;
  /** json-render: non-empty lines that are not a JSON patch (prose, fences). */
  extraneousLines?: number;
}

const FENCE = /^```ui\+jsx[ \t]*\n([\s\S]*?)^```[ \t]*$/gm;

export function extractJsxBlocks(text: string): string[] {
  return [...text.matchAll(FENCE)].map((m) => m[1]!.replace(/\n$/, ""));
}

const BUILT_IN_ACTIONS = ["setState", "pushState", "removeState", "validateForm"];

export async function grade(format: Format, text: string, task: Task): Promise<Grade> {
  const problems: string[] = [];
  let uiText: string;
  let html: string;
  let wired: Set<string>;
  let extraneousLines: number | undefined;

  if (format === "ingenui") {
    const blocks = extractJsxBlocks(text);
    uiText = blocks.join("\n");
    if (blocks.length === 0) problems.push("no ui+jsx block");
    const serverIssues = validateGenUiMessage(text, genUiSchema);
    const rendered = await renderIngenui(text);
    html = rendered.html;
    // The client's issues are a superset (server/client parity + render errors).
    const issues = rendered.issues.length >= serverIssues.length ? rendered.issues : serverIssues;
    for (const issue of issues) problems.push(describeIssue(issue));
    wired = new Set([...uiText.matchAll(/actions\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]!));
  } else {
    const compiled = compileSpec(text);
    const spec = compiled.spec;
    extraneousLines = compiled.rejectedLines.length;
    uiText = text
      .split("\n")
      .filter((l) => !compiled.rejectedLines.includes(l) && l.trim() !== "")
      .join("\n");
    if (!spec.root || Object.keys(spec.elements ?? {}).length === 0) problems.push("empty spec");
    const structural = validateSpec(spec);
    for (const issue of structural.issues) {
      if (issue.severity === "error") problems.push(`spec: ${issue.message}`);
    }
    const catalogResult = jsonRenderCatalog.validate(spec);
    if (!catalogResult.success) {
      for (const issue of catalogResult.error?.issues ?? []) {
        problems.push(`catalog: ${issue.path.join(".")}: ${issue.message}`);
      }
    }
    problems.push(...checkElements(spec));
    const rendered = renderJsonRender(spec);
    if (rendered.error) problems.push(`render: ${rendered.error}`);
    html = rendered.html;
    wired = new Set(
      Object.values(spec.elements ?? {}).flatMap((el) =>
        Object.values((el as { on?: Record<string, unknown> }).on ?? {}).flatMap(bindingActions),
      ),
    );
  }

  const renderedText = htmlText(html);
  const normalized = renderedText.replace(/\s+/g, "");
  const missingFacts = task.expect
    .filter((alts) => !alts.some((alt) => normalized.includes(alt.replace(/\s+/g, ""))))
    .map((alts) => alts[0]!);
  const missingActions = task.actions.filter((a) => !wired.has(a));
  const valid = problems.length === 0;
  const content = missingFacts.length === 0 && missingActions.length === 0;
  return {
    valid,
    content,
    success: valid && content,
    problems,
    missingFacts,
    missingActions,
    uiText,
    renderedText,
    ...(extraneousLines === undefined ? {} : { extraneousLines }),
  };
}

function describeIssue(issue: { kind: string; blockIndex?: number } & Record<string, unknown>): string {
  if (issue.kind === "jsx-error") {
    const event = issue.event as { type?: string; message?: string } | undefined;
    return `jsx-error: ${event?.message ?? event?.type ?? ""}`;
  }
  if (issue.kind === "render-error") return `render-error: ${String(issue.message ?? issue.error ?? "")}`;
  return issue.kind;
}

function bindingActions(binding: unknown): string[] {
  const list = Array.isArray(binding) ? binding : [binding];
  return list
    .map((b) => (b && typeof b === "object" ? (b as { action?: unknown }).action : undefined))
    .filter((a): a is string => typeof a === "string");
}

/** Per-element props schemas and action names (what json-render does not check). */
function checkElements(spec: Spec): string[] {
  const problems: string[] = [];
  const components = jsonRenderCatalog.data.components as Record<string, { props: z.ZodType }>;
  for (const [key, element] of Object.entries(spec.elements ?? {})) {
    const el = element as { type?: string; props?: Record<string, unknown>; on?: Record<string, unknown> };
    const def = el.type === undefined ? undefined : components[el.type];
    if (def) {
      const props = Object.fromEntries(
        Object.entries(el.props ?? {}).map(([k, v]) => [k, isDynamic(v) ? placeholderFor(def.props, k) : v]),
      );
      const result = def.props.safeParse(props);
      if (!result.success) {
        for (const issue of result.error.issues) {
          problems.push(`props: ${key}(${el.type}).${issue.path.join(".")}: ${issue.message}`);
        }
      }
    }
    for (const action of Object.values(el.on ?? {}).flatMap(bindingActions)) {
      if (!actionNames.includes(action) && !BUILT_IN_ACTIONS.includes(action)) {
        problems.push(`unknown action: ${action}`);
      }
    }
  }
  return problems;
}

function isDynamic(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).some((k) => k.startsWith("$"))
  );
}

/** A value that passes the prop's schema, standing in for a dynamic expression. */
function placeholderFor(schema: z.ZodType, prop: string): unknown {
  for (const candidate of ["x", 0, true, null]) {
    const shape = (schema as unknown as { shape?: Record<string, z.ZodType> }).shape;
    if (shape?.[prop]?.safeParse(candidate).success) return candidate;
  }
  return undefined;
}
