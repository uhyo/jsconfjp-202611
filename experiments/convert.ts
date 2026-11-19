/**
 * The same UI in both formats: converts the JSX of a ui+jsx block to the
 * json-render SpecStream that draws the same tree with the same catalog
 * (text children → the `text` / `label` prop, onClick={actions.X} →
 * on.press). Keys follow json-render's prompt ("metric-1" style:
 * lowercased type + counter). Lets token counts compare one UI written two
 * ways, on real model output.
 */
import { createParser, type Node } from "@ingenui/incremental-jsx-parser/core";

const TEXT_PROP: Record<string, string> = {
  Title: "text",
  Text: "text",
  Item: "text",
  Callout: "text",
  Badge: "label",
  Button: "label",
};

interface Element {
  type: string;
  props: Record<string, unknown>;
  children: string[];
  on?: Record<string, { action: string }>;
}

export function parseJsx(source: string): readonly Node[] {
  const parser = createParser();
  parser.write(source);
  parser.end();
  return parser.getTree();
}

function textOf(nodes: readonly Node[]): string {
  return nodes
    .map((n) => {
      if (n.kind === "text") return n.value;
      if (n.kind === "expression") return n.value == null ? "" : String(n.value);
      if (n.kind === "element" || n.kind === "fragment") return textOf(n.children);
      return "";
    })
    .join("");
}

/** JSONL patches drawing `source`'s tree, or null if it has no single root. */
export function jsxToSpecStream(source: string): string | null {
  const roots = parseJsx(source).filter((n) => !(n.kind === "text" && n.value.trim() === ""));
  if (roots.length !== 1 || roots[0]!.kind !== "element") return null;
  const counters = new Map<string, number>();
  const lines: string[] = [];
  const key = (type: string) => {
    const n = (counters.get(type) ?? 0) + 1;
    counters.set(type, n);
    const base = type.toLowerCase();
    return n === 1 ? base : `${base}-${n}`;
  };
  const visit = (node: Node): string | null => {
    if (node.kind !== "element") return null;
    const k = key(node.tag);
    const el: Element = { type: node.tag, props: {}, children: [] };
    for (const [name, value] of Object.entries(node.props)) {
      if (value && typeof value === "object" && "kind" in value) {
        if (value.kind === "variable" && value.path[0] === "actions" && name.startsWith("on")) {
          el.on = { press: { action: value.path[1]! } };
        } else if (value.kind === "expression") {
          el.props[name] = value.value;
        } else {
          el.props[name] = textOf([value as Node]);
        }
      } else {
        el.props[name] = value;
      }
    }
    const textProp = TEXT_PROP[node.tag];
    if (textProp) {
      el.props[textProp] = textOf(node.children).trim();
    }
    lines.push(""); // reserve this element's slot (parent before children)
    const at = lines.length - 1;
    if (!textProp) {
      for (const child of node.children) {
        const childKey = visit(child);
        if (childKey) el.children.push(childKey);
      }
    }
    lines[at] = JSON.stringify({ op: "add", path: `/elements/${k}`, value: el });
    return k;
  };
  const rootKey = visit(roots[0]!);
  return [JSON.stringify({ op: "add", path: "/root", value: rootKey }), ...lines].join("\n") + "\n";
}
