/**
 * The real thing: chat with Claude through ingenui's demo server. Replies
 * stream through the server's `pipeGenUi` into `useGenUiMessage`; clicking
 * a button (or a form's submit) wired to `actions.*` asks the server for
 * the next turn (`/api/next`) and sends it, with what the user entered.
 * The left pane shows the raw text of the latest reply as it arrives.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ActionData, GenUiIssue, UiBlockWrapperProps } from "ingenui";
import { useGenUiMessage } from "ingenui/react";

import { useSlideContext } from "../deck/context";
import {
  fetchClaudeConfig,
  fetchNextTurn,
  streamChat,
  type ChatMessage,
  type ClaudeConfig,
} from "./claude-api";
import { Pane } from "./DemoParts";
import { genUi } from "./ingenui-catalog";
import { Shimmer } from "./ui";

const DEFAULT_STARTERS = [
  "2万円以下のワイヤレスイヤホンを3つ比較して",
  "一人暮らし向けのエスプレッソマシンを探しています",
  "JSConf JPに着ていくTシャツを探しています",
];

export interface ClaudeChatDemoProps {
  /** One-click first messages (stage-friendly: no typing needed). */
  starters?: string[];
  /** Show the raw text of the latest reply (default `true`). */
  showSource?: boolean;
}

type RenderError = { blockIndex: number; message: string };

type Turn =
  | { id: number; role: "user"; label: string; content: string }
  | { id: number; role: "assistant"; history: ChatMessage[] };

interface Reply {
  text: string;
  renderErrors: RenderError[];
}

/** A fired action, as sent to the server: its name and the values it reported. */
type ActionRequest = { action: string; data?: ActionData };
type ChatRequest = { text: string } | ActionRequest;

/** How a fired action shows in the chat. */
function actionLabel({ action, data }: ActionRequest): string {
  if (data === undefined) return `actions.${action} をクリック`;
  const values = Object.entries(data).map(([key, value]) => `${key}: ${typeof value === "string" ? value : value.join(", ")}`);
  return `actions.${action} を送信（${values.join(" / ")}）`;
}

export function ClaudeChatDemo(props: ClaudeChatDemoProps) {
  const { mode } = useSlideContext();
  // Thumbnails and print: no network, no API spend.
  if (mode !== "main") {
    return (
      <div className="demo">
        <div className="claude-placeholder">💬 Claudeとのライブチャット（スライド表示中のみ動作）</div>
      </div>
    );
  }
  return <ClaudeChat {...props} />;
}

function ClaudeChat({ starters = DEFAULT_STARTERS, showSource = true }: ClaudeChatDemoProps) {
  const [config, setConfig] = useState<ClaudeConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState({ text: "", done: true });
  const replies = useRef(new Map<number, Reply>());
  const nextId = useRef(0);
  const busyRef = useRef(false);
  const sendRef = useRef<(request: ChatRequest) => Promise<void>>(async () => {});

  useEffect(() => {
    fetchClaudeConfig().then(setConfig, (err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const setBusyBoth = (value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  };

  /** The conversation so far, as the model sees it. */
  const conversation = (): ChatMessage[] => {
    const messages: ChatMessage[] = [];
    for (const turn of turns) {
      const content = turn.role === "user" ? turn.content : replies.current.get(turn.id)?.text;
      if (content?.trim()) messages.push({ role: turn.role, content });
    }
    return messages;
  };

  const send = async (request: ChatRequest) => {
    if (busyRef.current) return;
    setBusyBoth(true);
    setError(null);
    const last = turns.findLast((turn) => turn.role === "assistant");
    const reply = last ? replies.current.get(last.id) : undefined;
    try {
      // The server composes the turn: the typed text or the action's
      // canonical message (with the values entered), plus feedback on the
      // previous reply.
      const content = await fetchNextTurn({
        message: reply?.text ?? "",
        ...request,
        renderErrors: reply?.renderErrors ?? [],
      });
      if (content === null) {
        setBusyBoth(false);
        return;
      }
      const label = "text" in request ? request.text : actionLabel(request);
      const history = [...conversation(), { role: "user" as const, content }];
      setTurns((prev) => [
        ...prev,
        { id: nextId.current++, role: "user", label, content },
        { id: nextId.current++, role: "assistant", history },
      ]);
      if ("text" in request) setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusyBoth(false);
    }
  };
  sendRef.current = send;

  const reset = () => {
    setTurns([]);
    replies.current.clear();
    setLatest({ text: "", done: true });
    setError(null);
    setBusyBoth(false);
  };

  const scroll = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scroll.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, latest.text]);

  const canSend = config?.available === true && !busy && input.trim() !== "";

  return (
    <div className="demo">
      <div className="demo-controls claude-head">
        <span className={`claude-status ${config?.available ? "is-ok" : ""}`}>
          {config === null
            ? error === null
              ? "接続中…"
              : "未接続"
            : config.available
              ? config.model
              : "Claude未設定"}
        </span>
        {busy && <span className="claude-busy">{latest.text === "" ? "考え中…" : "受信中…"}</span>}
        <button type="button" className="demo-btn" onClick={reset} disabled={turns.length === 0} style={{ marginLeft: "auto" }}>
          ↺ 新しい会話
        </button>
      </div>
      <div className={`demo-panes ${showSource ? "claude-panes" : "demo-panes--single"}`}>
        {showSource && (
          <Pane label="Claudeの出力（受信テキスト）" tone="blue" aside={<span className="demo-count">{latest.text.length.toLocaleString()} 文字</span>}>
            <SourceText text={latest.text} streaming={!latest.done} />
          </Pane>
        )}
        <Pane label="チャット" tone="orange" className="demo-pane--render">
          <div ref={scroll} className="demo-scroll claude-turns">
            {config !== null && !config.available && (
              <p className="claude-note">
                デモサーバーに <code>ANTHROPIC_API_KEY</code> が設定されていません。
              </p>
            )}
            {turns.length === 0 && config?.available && (
              <div className="claude-starters">
                {starters.map((starter) => (
                  <button key={starter} type="button" className="claude-chip" disabled={busy} onClick={() => void send({ text: starter })}>
                    {starter}
                  </button>
                ))}
              </div>
            )}
            {turns.map((turn) =>
              turn.role === "user" ? (
                <div key={turn.id} className="claude-user">
                  <div className="claude-user__bubble">{turn.label}</div>
                </div>
              ) : (
                <AssistantReply
                  key={turn.id}
                  history={turn.history}
                  onProgress={(text, done) => setLatest({ text, done })}
                  onAction={(action) => void sendRef.current(action)}
                  onSettled={(reply) => {
                    replies.current.set(turn.id, reply);
                    setBusyBoth(false);
                  }}
                />
              ),
            )}
            {error !== null && <div className="claude-error">{error}</div>}
          </div>
          <form
            className="claude-composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSend) void send({ text: input.trim() });
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={busy ? "返信中…" : "メッセージを入力（Enterで送信）"}
              aria-label="Claudeへのメッセージ"
              disabled={config?.available !== true}
            />
            <button type="submit" className="demo-btn demo-btn--primary" disabled={!canSend}>
              送信
            </button>
          </form>
        </Pane>
      </div>
    </div>
  );
}

function SourceText({ text, streaming }: { text: string; streaming: boolean }) {
  const ref = useRef<HTMLPreElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);
  return (
    <pre ref={ref} className="demo-source">
      {text}
      {streaming && <span className="demo-caret" />}
    </pre>
  );
}

function issueLabel(issue: GenUiIssue): string {
  const block = `block ${issue.blockIndex + 1}`;
  switch (issue.kind) {
    case "jsx-error":
      return `${block}: ${issue.event.message}`;
    case "render-error":
      return `${block}: render error`;
    case "unclosed-fence":
      return `${block}: unclosed fence`;
  }
}

/** A block with issues (or cut off when the server stopped Claude) stays visible, marked. */
function UiBlockFrame({ issues, crashed, state, children }: UiBlockWrapperProps) {
  if (crashed) return <div className="ui-callout ui-callout--warning">UI block crashed</div>;
  const broken = issues.length > 0 || state === "unterminated";
  return <div className={`genui-block${broken ? " is-broken" : ""}`}>{children}</div>;
}

function AssistantReply({
  history,
  onProgress,
  onAction,
  onSettled,
}: {
  history: ChatMessage[];
  onProgress(text: string, done: boolean): void;
  onAction(action: ActionRequest): void;
  onSettled(reply: Reply): void;
}) {
  const textRef = useRef("");
  const renderErrors = useRef<RenderError[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);

  // One request per reply, made once (keyed by turn).
  const stream = useMemo(
    () =>
      streamChat(history, (text, done) => {
        textRef.current = text;
        onProgress(text, done);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { node, message } = useGenUiMessage(stream, {
    ...genUi,
    Pending: Shimmer,
    wrapUiBlock: UiBlockFrame,
    // Only the name and the entered values (`event.data`: ingenui reads
    // them from the form's submit event) go to the server, which writes the
    // message itself.
    onAction: (event) =>
      onAction({ action: event.name, ...(event.data !== undefined && { data: event.data }) }),
    onIssue: (issue) => {
      if (issue.kind === "render-error") {
        renderErrors.current.push({
          blockIndex: issue.blockIndex,
          message: issue.error instanceof Error ? issue.error.message : String(issue.error),
        });
      }
      setIssues((prev) => [...prev, issueLabel(issue)]);
    },
    onStreamError: (error) => setFailure(error instanceof Error ? error.message : String(error)),
  });

  useEffect(() => {
    const settle = () => {
      onProgress(textRef.current, true);
      onSettled({ text: textRef.current, renderErrors: renderErrors.current });
    };
    message.done.then(settle, settle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return (
    <div className="claude-reply">
      <div className="genui-message">{node}</div>
      {failure !== null && <div className="claude-error">{failure}</div>}
      {issues.length > 0 && (
        <div className="claude-issues">⚠ {issues.join(" / ")}</div>
      )}
    </div>
  );
}
