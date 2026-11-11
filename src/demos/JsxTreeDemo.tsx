/**
 * The parser's output, not rendered: JSX streams in on the left, and the
 * right shows the React element tree `useIncrementalJsx` returns — the
 * components with their props, text children and the `<Pending />` frontier.
 *
 * The snapshot is a plain tree of React elements, so this just walks it.
 * Elements whose object is new in this snapshot are highlighted: settled
 * subtrees are cached by the parser and keep their identity, so only the
 * open path down to `<Pending />` (and whatever just arrived) lights up.
 */
import { Fragment, isValidElement, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { Pending } from "@ingenui/incremental-jsx-parser";
import { useIncrementalJsx } from "@ingenui/incremental-jsx-parser/react";
import type { JsxErrorEvent } from "@ingenui/incremental-jsx-parser";

import { FollowScroll, Pane, Progress, SourceView, StreamControls } from "./DemoParts";
import { parserComponents } from "./ingenui-catalog";
import { useStreamPlayer, type StreamPlayer } from "./player";
import { jsx, pick, type JsxSampleId } from "./samples";

export interface JsxTreeDemoProps {
  /** A sample from `samples.ts` (`jsx`). */
  sample?: JsxSampleId;
  /** Or the JSX to stream. */
  source?: string;
  autoplay?: boolean;
  speed?: number;
  /** Show the received text (default `true`). */
  showSource?: boolean;
  /** Show the not-yet-received text faintly after the caret. */
  showUpcoming?: boolean;
  /**
   * Show the context providers the parser wraps every component in (they
   * feed `useIsElementComplete`). Default `false`: folded into an "open"
   * mark on the component.
   */
  showProviders?: boolean;
  /** Highlight the elements created anew in each snapshot (default `true`). */
  highlightNew?: boolean;
}

export function JsxTreeDemo({
  sample,
  source,
  autoplay,
  speed,
  showSource = true,
  showUpcoming = false,
  showProviders = false,
  highlightNew = true,
}: JsxTreeDemoProps) {
  const text = pick(jsx, sample ?? (source === undefined ? "product" : undefined), source);
  const { player, snapshot, reset } = useStreamPlayer(text, { autoplay, speed });
  const [log, setLog] = useState<string[]>([]);
  const upcoming = showUpcoming ? Array.from(text).slice(snapshot.position).join("") : undefined;
  return (
    <div className="demo">
      <StreamControls
        players={[player]}
        snapshots={[snapshot]}
        onReset={() => {
          setLog([]);
          reset();
        }}
      >
        <Progress snapshot={snapshot} />
      </StreamControls>
      <div className={`demo-panes ${showSource ? "" : "demo-panes--single"}`}>
        {showSource && (
          <Pane label="受信したJSX" tone="blue">
            <SourceView snapshot={snapshot} upcoming={upcoming} />
          </Pane>
        )}
        <Pane
          label="React 要素ツリー"
          tone="orange"
          aside={highlightNew && <span className="rtree-legend">新しく作られた要素</span>}
        >
          <FollowScroll deps={snapshot.position}>
            <LiveTree
              player={player}
              showProviders={showProviders}
              highlightNew={highlightNew}
              onLog={(line) => setLog((l) => [...l, line])}
            />
          </FollowScroll>
          {log.length > 0 && (
            <div className="demo-log">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </Pane>
      </div>
    </div>
  );
}

interface LiveTreeProps {
  player: StreamPlayer;
  showProviders: boolean;
  highlightNew: boolean;
  onLog(line: string): void;
}

/** Keyed by player: a reset gives a new stream and so a new parser. */
function LiveTree({ player, showProviders, highlightNew, onLog }: LiveTreeProps) {
  // Options are read once per parser.
  const options = useMemo(
    () => ({
      components: parserComponents,
      Pending,
      variables: { actions: { addToCart: () => {} } },
      onJsxError: (event: JsxErrorEvent) => onLog(`⚠ ${event.message}`),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player],
  );
  const node = useIncrementalJsx(player.stream, options);

  // Which element objects are new since the previous snapshot. Only while
  // streaming: once the stream ends (no `<Pending />` left) nothing is
  // being rebuilt, and the final state shows no highlight.
  const previous = useRef<WeakSet<object>>(new WeakSet());
  const fresh = useMemo(() => {
    const seen = new WeakSet<object>();
    const fresh = new WeakSet<object>();
    let pending = false;
    walkElements(node, (element) => {
      seen.add(element);
      if (!previous.current.has(element)) fresh.add(element);
      if (element.type === Pending) pending = true;
    });
    previous.current = seen;
    return pending && highlightNew ? fresh : new WeakSet<object>();
  }, [node, highlightNew]);

  const ctx: TreeContext = { fresh, showProviders };
  const rows = renderChildren(node, ctx, "r");
  return (
    <div className="rtree">
      {rows.length > 0 ? rows : <div className="rtree-empty">(まだ何もありません)</div>}
    </div>
  );
}

interface TreeContext {
  fresh: WeakSet<object>;
  showProviders: boolean;
}

type AnyElement = ReactElement<Record<string, unknown>>;

const CONTEXT_TYPES = new Set([Symbol.for("react.context"), Symbol.for("react.provider")]);

function isProvider(element: AnyElement): boolean {
  const type = element.type as unknown;
  return (
    typeof type === "object" &&
    type !== null &&
    CONTEXT_TYPES.has((type as { $$typeof?: symbol }).$$typeof as symbol)
  );
}

function walkElements(node: ReactNode, visit: (element: AnyElement) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walkElements(child as ReactNode, visit);
  } else if (isValidElement(node)) {
    const element = node as AnyElement;
    visit(element);
    walkElements(element.props.children as ReactNode, visit);
    for (const [name, value] of Object.entries(element.props)) {
      if (name !== "children" && isValidElement(value)) walkElements(value, visit);
    }
  }
}

/** Catalog names by component, so minified builds still show `Card`. */
const componentNames = new Map<unknown, string>([
  ...Object.entries(parserComponents).map(([name, c]) => [c, name] as const),
  [Pending, "Pending"],
]);

function typeName(element: AnyElement): string {
  const type = element.type as unknown;
  if (typeof type === "string") return type;
  if (type === Fragment) return "";
  const known = componentNames.get(type);
  if (known) return known;
  if (isProvider(element)) return "Context";
  const fn = type as ComponentType & { displayName?: string };
  return fn.displayName ?? fn.name ?? "Anonymous";
}

/** One row per element / text; nesting indents (`.rtree-children`). */
function renderChildren(node: ReactNode, ctx: TreeContext, path: string): ReactNode[] {
  const out: ReactNode[] = [];
  const list = Array.isArray(node) ? node : [node];
  list.forEach((child: ReactNode, i) => {
    const key = isValidElement(child) && child.key != null ? `${path}/${child.key}` : `${path}/#${i}`;
    if (Array.isArray(child)) {
      out.push(...renderChildren(child, ctx, key));
    } else if (isValidElement(child)) {
      out.push(<ElementRow key={key} element={child as AnyElement} ctx={ctx} path={key} />);
    } else if (typeof child === "string" || typeof child === "number") {
      out.push(
        <div key={key} className="rtree-row rtree-text">
          {JSON.stringify(String(child))}
        </div>,
      );
    }
    // null / undefined / booleans render nothing, so they aren't in the tree.
  });
  return out;
}

function ElementRow({
  element,
  ctx,
  path,
  open,
}: {
  element: AnyElement;
  ctx: TreeContext;
  path: string;
  open?: boolean;
}) {
  // The parser wraps each component in `<ElementCompleteContext value={complete}>`.
  if (isProvider(element) && !ctx.showProviders) {
    const inner = element.props.children;
    if (isValidElement(inner)) {
      return (
        <ElementRow
          element={inner as AnyElement}
          ctx={ctx}
          path={path}
          open={element.props.value === false}
        />
      );
    }
  }

  const name = typeName(element);
  const isPending = element.type === Pending;
  const isHost = typeof element.type === "string";
  const { children, ...props } = element.props;
  const kids = renderChildren(children as ReactNode, ctx, path);
  const fresh = ctx.fresh.has(element);
  const className = ["rtree-node", fresh && "is-fresh", isPending && "rtree-node--pending"]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      <div className="rtree-row">
        <span className="rtree-punct">&lt;</span>
        <span className={isHost ? "rtree-host" : "rtree-component"}>{name}</span>
        {Object.entries(props).map(([prop, value]) =>
          value === undefined ? null : (
            <span key={prop} className="rtree-prop">
              {" "}
              <span className="rtree-prop__name">{prop}</span>
              <span className="rtree-punct">=</span>
              <PropValue value={value} />
            </span>
          ),
        )}
        <span className="rtree-punct">{kids.length > 0 ? ">" : " />"}</span>
        {open && <span className="rtree-badge">open</span>}
      </div>
      {kids.length > 0 && <div className="rtree-children">{kids}</div>}
    </div>
  );
}

function PropValue({ value }: { value: unknown }) {
  if (typeof value === "string") return <span className="rtree-string">{JSON.stringify(value)}</span>;
  let shown: string;
  if (typeof value === "function") shown = `ƒ\u00a0${value.name || ""}`.trimEnd();
  else if (isValidElement(value)) shown = `<${typeName(value as AnyElement)} …>`;
  else if (value === null || typeof value !== "object") shown = String(value);
  else shown = Array.isArray(value) ? "[…]" : "{…}";
  return (
    <span className="rtree-expr">
      <span className="rtree-punct">{"{"}</span>
      {shown}
      <span className="rtree-punct">{"}"}</span>
    </span>
  );
}
