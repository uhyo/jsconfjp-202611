/**
 * The parser on its own: JSX streams in on the left, the live React tree
 * grows on the right, with the `<Pending />` frontier where the next
 * characters will land.
 */
import { useMemo, useState } from "react";
import { useIncrementalJsx } from "@ingenui/incremental-jsx-parser/react";
import type { JsxErrorEvent } from "@ingenui/incremental-jsx-parser";

import { FollowScroll, Pane, Progress, SourceView, StreamControls } from "./DemoParts";
import { parserComponents } from "./ingenui-catalog";
import { useStreamPlayer, type StreamPlayer } from "./player";
import { jsx, pick, type JsxSampleId } from "./samples";
import { Shimmer } from "./ui";

export interface JsxStreamDemoProps {
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
}

export function JsxStreamDemo({
  sample,
  source,
  autoplay,
  speed,
  showSource = true,
  showUpcoming = false,
}: JsxStreamDemoProps) {
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
        <Pane label="React ツリー" tone="orange" className="demo-pane--render">
          <FollowScroll deps={snapshot.position}>
            <LiveTree player={player} onLog={(line) => setLog((l) => [...l, line])} />
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

/** Keyed by player: a reset gives a new stream and so a new parser. */
function LiveTree({ player, onLog }: { player: StreamPlayer; onLog(line: string): void }) {
  // Options are read once per parser.
  const options = useMemo(
    () => ({
      components: parserComponents,
      Pending: Shimmer,
      variables: {
        actions: {
          addToCart: () => onLog("onClick → actions.addToCart()"),
        },
      },
      onJsxError: (event: JsxErrorEvent) => onLog(`⚠ ${event.message}`),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player],
  );
  const node = useIncrementalJsx(player.stream, options);
  return <div className="demo-tree">{node}</div>;
}
