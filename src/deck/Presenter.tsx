import { useEffect, useState } from "react";

import { useDeckKeys, useNavigation } from "./navigation";
import { ScaledSlide, SlideView } from "./SlideView";
import type { Slide } from "./types";

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * The speaker's window (`?presenter`, or press `p` in the deck): current and
 * next slide, notes, and a timer. Navigating here moves the audience window
 * too (and vice versa). Demos are interactive only in the audience window.
 */
export function Presenter({ slides }: { slides: Slide[] }) {
  const total = slides.length;
  const nav = useNavigation(total);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const now = useNow(500);

  useDeckKeys({
    next: () => {
      setStartedAt((t) => t ?? Date.now());
      nav.next();
    },
    prev: nav.prev,
    first: () => nav.goto(0),
    last: () => nav.goto(total - 1),
    goto: nav.goto,
  });

  const current = slides[nav.index];
  const next = slides[nav.index + 1];
  return (
    <div className="presenter">
      <div className="presenter__current">
        <ScaledSlide>
          {current && (
            <SlideView key={nav.index} slide={current} index={nav.index} total={total} mode="preview" />
          )}
        </ScaledSlide>
      </div>
      <div className="presenter__side">
        <div className="presenter__next">
          <div className="presenter__caption">Next</div>
          <ScaledSlide>
            {next ? (
              <SlideView
                key={nav.index + 1}
                slide={next}
                index={nav.index + 1}
                total={total}
                mode="preview"
              />
            ) : (
              <div className="presenter__end">End</div>
            )}
          </ScaledSlide>
        </div>
        <div className="presenter__notes">{current?.notes || <span className="muted">(no notes)</span>}</div>
      </div>
      <div className="presenter__bar">
        <button type="button" onClick={nav.prev}>
          ←
        </button>
        <span className="presenter__count">
          {nav.index + 1} / {total}
        </span>
        <button type="button" onClick={nav.next}>
          →
        </button>
        <button
          type="button"
          className="presenter__timer"
          title="Click to start / reset"
          onClick={() => setStartedAt(startedAt === null ? Date.now() : null)}
        >
          {startedAt === null ? "▶ 00:00" : formatDuration(now - startedAt)}
        </button>
        <span className="presenter__clock">
          {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
