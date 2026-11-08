/**
 * A controllable fake LLM stream: emits a text a few characters at a time
 * through a `ReadableStream<string>`, with play / pause and a speed knob, and
 * exposes how much has been emitted (for the "received text" pane).
 *
 * The libraries under demo only ever see the `stream` — exactly what they'd
 * get from `fetch().body` piped through a `TextDecoderStream`.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { useSlideContext } from "../deck/context";

export type PlayerStatus = "idle" | "playing" | "paused" | "done";

export interface PlayerSnapshot {
  status: PlayerStatus;
  /** Characters (code points) emitted so far. */
  position: number;
  /** The text emitted so far. */
  text: string;
  /** Total characters. */
  length: number;
}

export interface PlayerOptions {
  /** Emit everything at once (previews, print). */
  instant?: boolean;
  /** Milliseconds between chunks at speed 1. */
  intervalMs?: number;
}

/**
 * Chunk sizes cycle through this pattern — roughly token-sized and uneven,
 * like a model's output (and so the parser sees tags split anywhere).
 */
const CHUNK_PATTERN = [3, 2, 4, 1, 3, 5, 2, 3, 1, 4];

let nextId = 0;

export class StreamPlayer {
  /** Unique per player — a React key that changes on reset. */
  readonly id = nextId++;
  readonly stream: ReadableStream<string>;
  readonly #chars: string[];
  readonly #intervalMs: number;
  #controller!: ReadableStreamDefaultController<string>;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #tick = 0;
  #position = 0;
  #status: PlayerStatus = "idle";
  #speed = 1;
  #snapshot: PlayerSnapshot;
  readonly #listeners = new Set<() => void>();

  constructor(text: string, options: PlayerOptions = {}) {
    this.#chars = Array.from(text);
    this.#intervalMs = options.intervalMs ?? 40;
    this.stream = new ReadableStream<string>({
      start: (controller) => {
        this.#controller = controller;
      },
      cancel: () => this.#stop(),
    });
    if (options.instant) {
      this.#controller.enqueue(text);
      this.#controller.close();
      this.#position = this.#chars.length;
      this.#status = "done";
    }
    this.#snapshot = this.#makeSnapshot();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getSnapshot = (): PlayerSnapshot => this.#snapshot;

  get speed(): number {
    return this.#speed;
  }

  set speed(value: number) {
    this.#speed = value;
  }

  play(): void {
    if (this.#status === "done" || this.#status === "playing") return;
    this.#status = "playing";
    this.#emit();
    this.#schedule();
  }

  pause(): void {
    if (this.#status !== "playing") return;
    this.#stop();
    this.#status = "paused";
    this.#emit();
  }

  toggle(): void {
    if (this.#status === "playing") this.pause();
    else this.play();
  }

  /** Emit the rest at once. */
  finish(): void {
    if (this.#status === "done") return;
    this.#stop();
    this.#push(this.#chars.length - this.#position);
  }

  dispose(): void {
    this.#stop();
    this.#listeners.clear();
  }

  #schedule(): void {
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      const size = CHUNK_PATTERN[this.#tick++ % CHUNK_PATTERN.length]!;
      // Faster speeds send bigger chunks rather than shorter intervals, so
      // render work per second stays similar.
      this.#push(Math.max(1, Math.round(size * Math.max(1, this.#speed))));
      if (this.#status === "playing") this.#schedule();
    }, this.#intervalMs / Math.min(1, this.#speed));
  }

  #push(count: number): void {
    const end = Math.min(this.#chars.length, this.#position + count);
    if (end > this.#position) {
      try {
        this.#controller.enqueue(this.#chars.slice(this.#position, end).join(""));
      } catch {
        // The consumer went away (cancelled); stop quietly.
        this.#stop();
        return;
      }
      this.#position = end;
    }
    if (this.#position >= this.#chars.length) {
      this.#stop();
      this.#status = "done";
      try {
        this.#controller.close();
      } catch {
        // Already closed or cancelled.
      }
    }
    this.#emit();
  }

  #stop(): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  #makeSnapshot(): PlayerSnapshot {
    return {
      status: this.#status,
      position: this.#position,
      text: this.#chars.slice(0, this.#position).join(""),
      length: this.#chars.length,
    };
  }

  #emit(): void {
    this.#snapshot = this.#makeSnapshot();
    for (const listener of this.#listeners) listener();
  }
}

export interface UseStreamPlayer {
  player: StreamPlayer;
  snapshot: PlayerSnapshot;
  /** Start over with a fresh stream (re-creates whatever consumes it). */
  reset(): void;
}

/**
 * A player for `text`, recreated by `reset()`. In previews and print mode
 * the stream is complete from the start, so thumbnails show the result.
 */
export function useStreamPlayer(
  text: string,
  { autoplay = false, speed = 1 }: { autoplay?: boolean; speed?: number } = {},
): UseStreamPlayer {
  const { mode } = useSlideContext();
  const instant = mode !== "main";
  const create = useCallback(() => {
    const player = new StreamPlayer(text, { instant });
    player.speed = speed;
    return player;
  }, [text, instant, speed]);
  const [player, setPlayer] = useState(create);
  useEffect(() => () => player.dispose(), [player]);
  useEffect(() => {
    if (autoplay) player.play();
  }, [player, autoplay]);
  const snapshot = useSyncExternalStore(player.subscribe, player.getSnapshot);
  const reset = useCallback(() => setPlayer(create()), [create]);
  return { player, snapshot, reset };
}
