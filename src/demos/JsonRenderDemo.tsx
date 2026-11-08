/**
 * json-render, for comparison: the model streams a SpecStream (JSONL, one
 * RFC 6902 patch per line) into a flat element map, which `<Renderer>`
 * draws. A patch only applies once its whole line has arrived.
 */
import { useEffect, useMemo, useState } from "react";
import { createSpecStreamCompiler, type Spec } from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react";

import { FollowScroll, Pane, Progress, SourceView, StreamControls } from "./DemoParts";
import { createRegistry } from "./json-render-catalog";
import { useStreamPlayer, type StreamPlayer } from "./player";
import { pick, specs, type SpecSampleId } from "./samples";

/** Feeds a player's stream into json-render's SpecStream compiler. */
export function useSpecStream(player: StreamPlayer): { spec: Spec | null; loading: boolean; patches: number } {
  const [state, setState] = useState<{ spec: Spec | null; loading: boolean; patches: number }>({
    spec: null,
    loading: true,
    patches: 0,
  });
  useEffect(() => {
    // Seed like json-render's own `useUIStream` does: the renderer expects
    // `elements` to exist from the first patch (`/root`) on.
    const compiler = createSpecStreamCompiler<Spec>({ root: "", elements: {} });
    const reader = player.stream.getReader();
    let live = true;
    void (async () => {
      for (;;) {
        // oxlint-disable-next-line no-await-in-loop -- sequential by nature
        const { done, value } = await reader.read().catch(() => ({ done: true, value: undefined }));
        if (!live) return;
        if (done || value === undefined) {
          const spec = compiler.getResult();
          setState({ spec: { ...spec }, loading: false, patches: compiler.getPatches().length });
          return;
        }
        const { result, newPatches } = compiler.push(value);
        if (newPatches.length > 0) {
          setState({ spec: result, loading: true, patches: compiler.getPatches().length });
        }
      }
    })();
    return () => {
      live = false;
      void reader.cancel().catch(() => {});
    };
  }, [player]);
  return state;
}

export interface JsonRenderDemoProps {
  sample?: SpecSampleId;
  source?: string;
  autoplay?: boolean;
  speed?: number;
  showSource?: boolean;
}

export function JsonRenderDemo({ sample, source, autoplay, speed, showSource = true }: JsonRenderDemoProps) {
  const text = pick(specs, sample ?? (source === undefined ? "product" : undefined), source);
  const { player, snapshot, reset } = useStreamPlayer(text, { autoplay, speed });
  const [log, setLog] = useState<string[]>([]);
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
          <Pane label="受信したSpecStream（JSONL）" tone="blue">
            <SourceView snapshot={snapshot} />
          </Pane>
        )}
        <Pane label="画面" tone="orange" className="demo-pane--render">
          <JsonRenderView
            key={player.id}
            player={player}
            position={snapshot.position}
            onAction={(name) => setLog((l) => [...l, `on.press → ${name}`])}
          />
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

export function JsonRenderView({
  player,
  position,
  onAction,
}: {
  player: StreamPlayer;
  position: number;
  onAction(name: string): void;
}) {
  const { spec, loading } = useSpecStream(player);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { registry, handlers } = useMemo(() => createRegistry((name) => onAction(name)), [player]);
  const actionHandlers = useMemo(() => handlers(() => undefined, () => ({})), [handlers]);
  return (
    <FollowScroll deps={position}>
      <JSONUIProvider registry={registry} handlers={actionHandlers}>
        <div className="demo-tree">
          <Renderer spec={spec} registry={registry} loading={loading} />
        </div>
      </JSONUIProvider>
    </FollowScroll>
  );
}
