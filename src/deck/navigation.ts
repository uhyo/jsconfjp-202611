/**
 * The current slide index: kept in the URL hash (`#12`, 1-based) so reloads
 * and HMR keep the position, and synced between windows (audience ↔
 * presenter) over a BroadcastChannel.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const CHANNEL = "jsconfjp-202611-slides";

/** What the demo keys (`s`, `r`, `.`) ask the current slide's demo to do. */
export type DemoCommand = "toggle" | "reset" | "finish";

/** Window event carrying a `DemoCommand`, heard by `useDemoCommands`. */
const DEMO_EVENT = "deck:demo";

type SyncMessage = { type: "goto"; index: number } | { type: "demo"; command: DemoCommand };

function dispatchDemoCommand(command: DemoCommand): void {
  window.dispatchEvent(new CustomEvent<DemoCommand>(DEMO_EVENT, { detail: command }));
}

/**
 * Run `handler` on demo commands — from this window's keys or, over the
 * BroadcastChannel, the presenter window's. Only pass `enabled` for the
 * slide rendered in `"main"` mode, so previews and print ignore them.
 */
export function useDemoCommands(handler: (command: DemoCommand) => void, enabled: boolean): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const onCommand = (event: Event) => ref.current((event as CustomEvent<DemoCommand>).detail);
    window.addEventListener(DEMO_EVENT, onCommand);
    return () => window.removeEventListener(DEMO_EVENT, onCommand);
  }, [enabled]);
}

function readHash(total: number): number {
  const n = Number.parseInt(location.hash.replace(/^#\/?/, ""), 10);
  if (!Number.isFinite(n)) return 0;
  return clamp(n - 1, total);
}

function clamp(index: number, total: number): number {
  return Math.max(0, Math.min(total - 1, index));
}

export interface Navigation {
  index: number;
  goto(index: number): void;
  next(): void;
  prev(): void;
  /** Send a command to the current slide's demo, here and in synced windows. */
  demo(command: DemoCommand): void;
}

export function useNavigation(total: number): Navigation {
  const [index, setIndex] = useState(() => readHash(total));
  const channel = useRef<BroadcastChannel | null>(null);

  // Keep the hash in sync (replace, so Back leaves the deck rather than
  // stepping through every slide).
  useEffect(() => {
    const hash = `#${index + 1}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }, [index]);

  useEffect(() => {
    const onHash = () => setIndex(readHash(total));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [total]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (event: MessageEvent<SyncMessage>) => {
      if (event.data?.type === "goto") setIndex(clamp(event.data.index, total));
      else if (event.data?.type === "demo") dispatchDemoCommand(event.data.command);
    };
    channel.current = bc;
    return () => {
      bc.close();
      channel.current = null;
    };
  }, [total]);

  // Slides removed while editing: stay in range.
  useEffect(() => {
    if (index > total - 1) setIndex(clamp(index, total));
  }, [index, total]);

  const goto = useCallback(
    (target: number) => {
      const next = clamp(target, total);
      setIndex(next);
      channel.current?.postMessage({ type: "goto", index: next } satisfies SyncMessage);
    },
    [total],
  );

  const indexRef = useRef(index);
  indexRef.current = index;
  const next = useCallback(() => goto(indexRef.current + 1), [goto]);
  const prev = useCallback(() => goto(indexRef.current - 1), [goto]);

  const demo = useCallback((command: DemoCommand) => {
    dispatchDemoCommand(command);
    channel.current?.postMessage({ type: "demo", command } satisfies SyncMessage);
  }, []);

  return { index, goto, next, prev, demo };
}

/** Is the keyboard event aimed at something that takes text input? */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("[data-capture-keys]")) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export interface KeyHandlers {
  next(): void;
  prev(): void;
  first(): void;
  last(): void;
  goto(index: number): void;
  demo?(command: DemoCommand): void;
  toggleOverview?(): void;
  openPresenter?(): void;
  escape?(): void;
}

/**
 * Deck keyboard shortcuts. Typing a number then Enter jumps to that slide.
 * `s` / `r` / `.` play-pause / reset / finish the current slide's demo.
 * Presentation clickers send PageUp/PageDown (some send arrows), which are
 * covered.
 */
export function useDeckKeys(handlers: KeyHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    let digits = "";
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const h = ref.current;
      // Buttons inside demos: let Space/Enter press them.
      const onButton = event.target instanceof HTMLButtonElement;
      if (event.key !== "Enter" && !/^[0-9]$/.test(event.key)) digits = "";
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
          h.next();
          break;
        case " ":
          if (onButton) return;
          if (event.shiftKey) h.prev();
          else h.next();
          break;
        case "Enter":
          if (onButton) return;
          if (digits) h.goto(Number(digits) - 1);
          else h.next();
          digits = "";
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
        case "Backspace":
          h.prev();
          break;
        case "Home":
          h.first();
          break;
        case "End":
          h.last();
          break;
        case "f":
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen();
          break;
        case "s":
          h.demo?.("toggle");
          break;
        case "r":
          h.demo?.("reset");
          break;
        case ".":
          h.demo?.("finish");
          break;
        case "o":
          h.toggleOverview?.();
          break;
        case "p":
          h.openPresenter?.();
          break;
        case "Escape":
          h.escape?.();
          break;
        default:
          if (/^[0-9]$/.test(event.key)) digits += event.key;
          return;
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
