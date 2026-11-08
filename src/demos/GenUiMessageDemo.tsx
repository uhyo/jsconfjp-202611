/**
 * ingenui end to end: a Markdown message with ```ui+jsx fences streams in;
 * prose renders as Markdown, fences as live UI. Clicking a wired action
 * shows the next request the model would get; issues (bad JSX, unknown
 * components, …) are collected into the feedback report for the model.
 */
import { useEffect, useMemo, useState } from "react";
import type { ActionEvent, GenUiIssue, UiBlockWrapperProps } from "ingenui";
import { useGenUiMessage } from "ingenui/react";

import { Pane, Progress, SourceView, StreamControls, FollowScroll } from "./DemoParts";
import { genUi } from "./ingenui-catalog";
import { useStreamPlayer, type StreamPlayer } from "./player";
import { messages, pick, type MessageSampleId } from "./samples";
import { Shimmer } from "./ui";

export interface GenUiMessageDemoProps {
  sample?: MessageSampleId;
  source?: string;
  autoplay?: boolean;
  speed?: number;
  /** Show the received text (default `true`). */
  showSource?: boolean;
  /** Show the feedback report once the message is done (default `true`). */
  showReport?: boolean;
}

export function GenUiMessageDemo({
  sample,
  source,
  autoplay,
  speed,
  showSource = true,
  showReport = true,
}: GenUiMessageDemoProps) {
  const text = pick(messages, sample ?? (source === undefined ? "product" : undefined), source);
  const { player, snapshot, reset } = useStreamPlayer(text, { autoplay, speed });
  const [actions, setActions] = useState<ActionEvent[]>([]);
  return (
    <div className="demo">
      <StreamControls
        players={[player]}
        snapshots={[snapshot]}
        onReset={() => {
          setActions([]);
          reset();
        }}
      >
        <Progress snapshot={snapshot} />
      </StreamControls>
      <div className={`demo-panes ${showSource ? "" : "demo-panes--single"}`}>
        {showSource && (
          <Pane label="モデルの出力（Markdown）" tone="blue">
            <SourceView snapshot={snapshot} />
          </Pane>
        )}
        <Pane label="画面" tone="orange" className="demo-pane--render">
          <Message
            key={player.id}
            player={player}
            position={snapshot.position}
            onAction={(event) => setActions((a) => [...a, event])}
            showReport={showReport}
          />
          {actions.length > 0 && (
            <div className="demo-log">
              {actions.map((event, i) => (
                <div key={i}>
                  <span className="demo-log__label">次のリクエスト</span> {event.message}
                </div>
              ))}
            </div>
          )}
        </Pane>
      </div>
    </div>
  );
}

function issueLabel(issue: GenUiIssue): string {
  const block = `block ${issue.blockIndex + 1}`;
  switch (issue.kind) {
    case "jsx-error":
      return `${block}: ${issue.event.message}`;
    case "render-error":
      return `${block}: render error (${issue.error instanceof Error ? issue.error.message : String(issue.error)})`;
    case "unclosed-fence":
      return `${block}: the ui+jsx fence was never closed`;
  }
}

/** Marks a UI block that has issues, keeping it on screen. */
function UiBlockFrame({ issues, crashed, state, children }: UiBlockWrapperProps) {
  if (crashed) return <div className="ui-callout ui-callout--warning">UI block crashed</div>;
  const broken = issues.length > 0 || state === "unterminated";
  return <div className={`genui-block${broken ? " is-broken" : ""}`}>{children}</div>;
}

function Message({
  player,
  position,
  onAction,
  showReport,
}: {
  player: StreamPlayer;
  position: number;
  onAction(event: ActionEvent): void;
  showReport: boolean;
}) {
  const options = useMemo(
    () => ({
      ...genUi,
      Pending: Shimmer,
      wrapUiBlock: UiBlockFrame,
      onAction,
    }),
    // Options are read once per message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player],
  );
  const { node, message } = useGenUiMessage(player.stream, options);
  const [report, setReport] = useState<string | null>(null);
  const [issues, setIssues] = useState<readonly GenUiIssue[]>([]);
  useEffect(() => {
    let live = true;
    message.done.then(
      () => {
        if (!live) return;
        setIssues(message.getIssues());
        setReport(message.getIssueReport());
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [message]);
  return (
    <>
      <FollowScroll deps={position}>
        <div className="genui-message">{node}</div>
      </FollowScroll>
      {showReport && issues.length > 0 && (
        <details className="demo-report" open>
          <summary>
            ⚠ {issues.length} 件の問題 → モデルへのフィードバック
          </summary>
          <ul>
            {issues.map((issue, i) => (
              <li key={i}>{issueLabel(issue)}</li>
            ))}
          </ul>
          {report && <pre>{report}</pre>}
        </details>
      )}
    </>
  );
}
