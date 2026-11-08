/**
 * ingenui (JSX) vs json-render (SpecStream) side by side: the same UI, the
 * same components, streamed at the same rate (characters per tick). Shows
 * how much each format has to send and how the UI grows along the way.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIncrementalJsx } from "@ingenui/incremental-jsx-parser/react";

import { FollowScroll, Pane, Progress, SourceView, StreamControls } from "./DemoParts";
import { JsonRenderView } from "./JsonRenderDemo";
import { parserComponents } from "./ingenui-catalog";
import { useStreamPlayer, type PlayerSnapshot, type StreamPlayer } from "./player";
import { jsx, specs } from "./samples";
import { Shimmer } from "./ui";

export interface CompareDemoProps {
  /** A sample id present in both `jsx` and `specs`. */
  sample?: keyof typeof jsx & keyof typeof specs;
  autoplay?: boolean;
  speed?: number;
  /** Show the received text (default `true`). */
  showSource?: boolean;
}

/** Milliseconds from the first ▶ until the stream finished. */
function useElapsed(snapshot: PlayerSnapshot): number | null {
  const started = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  useEffect(() => {
    if (snapshot.status === "idle") {
      started.current = null;
      setElapsed(null);
    } else if (started.current === null) {
      started.current = performance.now();
    }
    if (snapshot.status === "done" && started.current !== null && snapshot.position > 0) {
      setElapsed(performance.now() - started.current);
    }
  }, [snapshot.status, snapshot.position]);
  return elapsed;
}

export function CompareDemo({ sample = "product", autoplay, speed, showSource = true }: CompareDemoProps) {
  const left = useStreamPlayer(jsx[sample], { autoplay, speed });
  const right = useStreamPlayer(specs[sample], { autoplay, speed });
  const leftElapsed = useElapsed(left.snapshot);
  const rightElapsed = useElapsed(right.snapshot);
  const [log, setLog] = useState<string[]>([]);
  return (
    <div className="demo demo--compare">
      <StreamControls
        players={[left.player, right.player]}
        snapshots={[left.snapshot, right.snapshot]}
        onReset={() => {
          setLog([]);
          left.reset();
          right.reset();
        }}
      />
      <div className="compare-grid">
        <CompareColumn
          name="ingenui"
          format="JSX"
          snapshot={left.snapshot}
          elapsed={leftElapsed}
          showSource={showSource}
        >
          <IngenuiView player={left.player} position={left.snapshot.position} />
        </CompareColumn>
        <CompareColumn
          name="json-render"
          format="SpecStream (JSONL)"
          snapshot={right.snapshot}
          elapsed={rightElapsed}
          showSource={showSource}
        >
          <JsonRenderView
            key={right.player.id}
            player={right.player}
            position={right.snapshot.position}
            onAction={(name) => setLog((l) => [...l, `json-render: ${name}`])}
          />
        </CompareColumn>
      </div>
      {log.length > 0 && <div className="demo-log">{log.at(-1)}</div>}
    </div>
  );
}

function CompareColumn({
  name,
  format,
  snapshot,
  elapsed,
  showSource,
  children,
}: {
  name: string;
  format: string;
  snapshot: PlayerSnapshot;
  elapsed: number | null;
  showSource: boolean;
  children: ReactNode;
}) {
  return (
    <div className="compare-col">
      <div className="compare-col__head">
        <strong>{name}</strong>
        <span className="muted">{format}</span>
        <span className="compare-col__time">{elapsed !== null ? `${(elapsed / 1000).toFixed(1)} 秒` : ""}</span>
      </div>
      <Progress snapshot={snapshot} />
      {showSource && (
        <Pane label="受信テキスト" tone="blue" className="compare-col__source">
          <SourceView snapshot={snapshot} />
        </Pane>
      )}
      <Pane label="画面" tone="orange" className="demo-pane--render">
        {children}
      </Pane>
    </div>
  );
}

function IngenuiView({ player, position }: { player: StreamPlayer; position: number }) {
  const options = useMemo(
    () => ({
      components: parserComponents,
      Pending: Shimmer,
      variables: { actions: { addToCart: () => {} } },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player],
  );
  const node = useIncrementalJsx(player.stream, options);
  return (
    <FollowScroll deps={position}>
      <div className="demo-tree">{node}</div>
    </FollowScroll>
  );
}
