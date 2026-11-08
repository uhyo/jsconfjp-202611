/**
 * Client for the server side of ingenui's demo app (`apps/demo/worker` in
 * uhyo/ingenui), which talks to Claude:
 *
 * - `GET  /api/config` — whether Claude is configured, and the model;
 * - `POST /api/chat`   — Claude's reply to a conversation, streamed through
 *   `pipeGenUi` (validated on the way; on a broken UI block the server stops
 *   Claude and asks it to continue the same message);
 * - `POST /api/next`   — the next user turn, composed by the server from
 *   structured input (typed text, or a fired action's name).
 *
 * In dev/preview the slides' server proxies `/api` to that app
 * (`INGENUI_DEMO_URL`, see `vite.config.ts`); a production build calls it
 * directly (CORS, allowed by the Worker's `ALLOWED_ORIGINS`).
 */

/**
 * The server's origin, or `""` for same-origin `/api` (the Vite proxy). A
 * build served from localhost is `vite preview`, which proxies too — and
 * localhost isn't an allowed origin of the Worker.
 */
const ORIGIN = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)
  ? ""
  : __INGENUI_API_ORIGIN__;

const API = `${ORIGIN}/api`;

const NOT_CONFIGURED =
  ORIGIN === ""
    ? "Set INGENUI_DEMO_URL and restart the slides' dev server."
    : `Check that ${ORIGIN} is up and lists this page's origin (${location.origin}) in ALLOWED_ORIGINS.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeConfig {
  available: boolean;
  model: string;
}

/** The server's error message for a failed response. */
async function errorOf(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const { error } = JSON.parse(text) as { error?: unknown };
    if (typeof error === "string") return error;
  } catch {
    // Not JSON.
  }
  if (response.status === 404 || response.status === 502 || response.status === 504) {
    return `The demo server isn't reachable (${response.status}). ${NOT_CONFIGURED}`;
  }
  return `${response.url} failed: ${response.status} ${text.slice(0, 200)}`;
}

export async function fetchClaudeConfig(): Promise<ClaudeConfig> {
  // A blocked cross-origin request rejects with a bare TypeError.
  const response = await fetch(`${API}/config`).catch(() => {
    throw new Error(`Can't reach the demo server. ${NOT_CONFIGURED}`);
  });
  if (!response.ok) throw new Error(await errorOf(response));
  const body = (await response.json().catch(() => null)) as { claude?: ClaudeConfig } | null;
  if (!body?.claude) {
    throw new Error(
      `/api/config didn't answer like ingenui's demo server. ${NOT_CONFIGURED}`,
    );
  }
  return body.claude;
}

export interface NextTurnInput {
  /** The previous assistant message, as streamed (`""` before the first). */
  message: string;
  text?: string;
  /** A fired action's name (`ActionEvent.name`). */
  action?: string;
  /** Render crashes — the one kind of issue only the client can observe. */
  renderErrors?: { blockIndex: number; message: string }[];
}

/** The next user turn as the server composes it; `null` when there is nothing to send. */
export async function fetchNextTurn(input: NextTurnInput): Promise<string | null> {
  const response = await fetch(`${API}/next`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await errorOf(response));
  const body = (await response.json()) as { text?: string | null };
  return body.text ?? null;
}

/**
 * Claude's reply as a byte stream for `useGenUiMessage`. Created
 * synchronously (the request starts with the stream); cancelling it aborts
 * the request, which makes the server abort Claude's.
 */
export function streamChat(
  messages: ChatMessage[],
  onProgress: (receivedSoFar: string, done: boolean) => void,
): ReadableStream<Uint8Array> {
  const abort = new AbortController();
  const decoder = new TextDecoder();
  let received = "";
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  return new ReadableStream<Uint8Array>({
    async start() {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages, recovery: "continue" }),
        signal: abort.signal,
      });
      if (!response.ok || !response.body) throw new Error(await errorOf(response));
      reader = response.body.getReader();
    },
    async pull(controller) {
      const { done, value } = await reader!.read();
      if (done) {
        received += decoder.decode();
        onProgress(received, true);
        controller.close();
        return;
      }
      received += decoder.decode(value, { stream: true });
      onProgress(received, false);
      controller.enqueue(value);
    },
    cancel() {
      abort.abort();
    },
  });
}
