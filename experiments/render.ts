/**
 * Render both formats' final UI to static HTML in Node, with the same
 * minimal host components (plain elements, no styling — only the text and
 * structure matter here). React.createElement instead of JSX so Node runs
 * this file directly (type stripping does not do .tsx).
 */
import { createElement as h, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSpecStreamCompiler, type Spec } from "@json-render/core";
import { defineRegistry, JSONUIProvider, Renderer } from "@json-render/react";
import { bindGenUi, createGenUiMessage, type GenUiIssue } from "ingenui";

import { genUiSchema, jsonRenderCatalog } from "./catalogs.ts";

type Kids = { children?: ReactNode };
const box = (tag: string, cls: string) => (p: Kids) => h(tag, { className: cls }, p.children);

const ingenuiComponents = {
  Card: box("section", "card"),
  CardHeader: box("header", "card-header"),
  CardBody: box("div", "card-body"),
  Title: box("h3", "title"),
  Text: box("p", "text"),
  Badge: (p: Kids & { tone?: string }) => h("span", { className: `badge ${p.tone ?? ""}` }, p.children),
  Button: (p: Kids & { variant?: string }) => h("button", { className: p.variant }, p.children),
  Avatar: (p: { initials?: string; name?: string }) => h("span", { className: "avatar" }, p.initials, " ", p.name),
  Stat: (p: { label?: string; value?: ReactNode }) => h("div", { className: "stat" }, h("b", null, p.value), " ", p.label),
  Row: box("div", "row"),
  List: box("ul", "list"),
  Item: box("li", "item"),
  Callout: (p: Kids & { tone?: string }) => h("aside", { className: `callout ${p.tone ?? ""}` }, p.children),
};

export interface RenderResult {
  html: string;
  /** Every issue the client reports, incl. `render-error`. */
  issues: readonly GenUiIssue[];
}

export async function renderIngenui(text: string): Promise<RenderResult> {
  const options = bindGenUi(genUiSchema, { components: ingenuiComponents });
  const message = createGenUiMessage(
    (async function* () {
      yield text;
    })(),
    options,
  );
  await message.done;
  const html = renderToStaticMarkup(h("div", null, message.getSnapshot()));
  const issues = message.getIssues();
  message.dispose();
  return { html, issues };
}

const { registry } = defineRegistry(jsonRenderCatalog, {
  components: {
    Card: ({ children }) => h("section", { className: "card" }, children),
    CardHeader: ({ children }) => h("header", { className: "card-header" }, children),
    CardBody: ({ children }) => h("div", { className: "card-body" }, children),
    Title: ({ props }) => h("h3", { className: "title" }, props.text),
    Text: ({ props }) => h("p", { className: "text" }, props.text),
    Badge: ({ props }) => h("span", { className: `badge ${props.tone ?? ""}` }, props.label),
    Button: ({ props }) => h("button", { className: props.variant ?? "" }, props.label),
    Avatar: ({ props }) => h("span", { className: "avatar" }, props.initials, " ", props.name),
    Stat: ({ props }) => h("div", { className: "stat" }, h("b", null, props.value), " ", props.label),
    Row: ({ children }) => h("div", { className: "row" }, children),
    List: ({ children }) => h("ul", { className: "list" }, children),
    Item: ({ props }) => h("li", { className: "item" }, props.text),
    Callout: ({ props }) => h("aside", { className: `callout ${props.tone ?? ""}` }, props.text),
  },
  actions: {
    addToCart: async () => {},
    showDetails: async () => {},
    contactSupport: async () => {},
    choosePlan: async () => {},
    retry: async () => {},
  },
});

export interface CompiledSpec {
  spec: Spec;
  /** Patches applied. */
  patches: number;
  /** Non-empty lines the compiler could not use (not a JSON patch). */
  rejectedLines: string[];
}

/** Compiles a SpecStream the way the client does (line by line). */
export function compileSpec(text: string): CompiledSpec {
  const compiler = createSpecStreamCompiler<Spec>({ root: "", elements: {} });
  compiler.push(text.endsWith("\n") ? text : `${text}\n`);
  const spec = compiler.getResult();
  const patches = compiler.getPatches().length;
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  const rejectedLines = lines.filter((line) => {
    try {
      const v = JSON.parse(line.trim()) as { op?: unknown; path?: unknown };
      return typeof v !== "object" || v === null || typeof v.op !== "string" || typeof v.path !== "string";
    } catch {
      return true;
    }
  });
  return { spec, patches, rejectedLines };
}

export function renderJsonRender(spec: Spec): { html: string; error: string | null } {
  try {
    const html = renderToStaticMarkup(
      h(JSONUIProvider, {
        registry,
        initialState: (spec as { state?: Record<string, unknown> }).state ?? {},
        children: h(Renderer, { spec, registry }),
      }),
    );
    return { html, error: null };
  } catch (error) {
    return { html: "", error: String(error) };
  }
}

/** Visible text of rendered HTML, whitespace collapsed. */
export function htmlText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
