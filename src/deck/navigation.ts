/**
 * The current slide index: kept in the URL hash (`#12`, 1-based) so reloads
 * and HMR keep the position, and synced between windows (audience ↔
 * presenter) over a BroadcastChannel.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const CHANNEL = "jsconfjp-202611-slides";

type SyncMessage = { type: "goto"; index: number };

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

  return { index, goto, next, prev };
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
  toggleOverview?(): void;
  openPresenter?(): void;
  escape?(): void;
}

/**
 * Deck keyboard shortcuts. Typing a number then Enter jumps to that slide.
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
