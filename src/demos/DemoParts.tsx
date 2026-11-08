/** Building blocks shared by the demo slides: controls and panes. */
import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

import type { PlayerSnapshot, StreamPlayer } from "./player";

const SPEEDS = [0.5, 1, 2, 4];

interface ControlsProps {
  /** One or more players driven together. */
  players: readonly StreamPlayer[];
  snapshots: readonly PlayerSnapshot[];
  onReset(): void;
  children?: ReactNode;
}

/** ▶ / ⏸, ↺, ⏭ and speed, for one or several players at once. */
export function StreamControls({ players, snapshots, onReset, children }: ControlsProps) {
  const playing = snapshots.some((s) => s.status === "playing");
  const done = snapshots.every((s) => s.status === "done");
  const speed = players[0]?.speed ?? 1;
  return (
    <div className="demo-controls">
      <button
        type="button"
        className="demo-btn demo-btn--primary"
        disabled={done}
        onClick={() => {
          for (const p of players) {
            if (playing) p.pause();
            else p.play();
          }
        }}
      >
        {playing ? "⏸ 一時停止" : snapshots.some((s) => s.position > 0) ? "▶ 再開" : "▶ 開始"}
      </button>
      <button type="button" className="demo-btn" onClick={onReset} title="最初から">
        ↺
      </button>
      <button
        type="button"
        className="demo-btn"
        disabled={done}
        onClick={() => {
          for (const p of players) p.finish();
        }}
        title="最後まで"
      >
        ⏭
      </button>
      <label className="demo-speed">
        速度
        <select
          defaultValue={String(speed)}
          onChange={(event) => {
            for (const p of players) p.speed = Number(event.target.value);
          }}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              ×{s}
            </option>
          ))}
        </select>
      </label>
      {children}
    </div>
  );
}

/** A thin progress bar with a "received / total" label. */
export function Progress({ snapshot }: { snapshot: PlayerSnapshot }) {
  const ratio = snapshot.length === 0 ? 1 : snapshot.position / snapshot.length;
  return (
    <div className="demo-progress" title={`${snapshot.position} / ${snapshot.length} chars`}>
      <div className="demo-progress__bar" style={{ width: `${ratio * 100}%` }} />
      <span className="demo-progress__label">
        {snapshot.position.toLocaleString()} / {snapshot.length.toLocaleString()} 文字
      </span>
    </div>
  );
}

interface PaneProps {
  label: ReactNode;
  tone?: "blue" | "orange" | "slate";
  className?: string;
  children: ReactNode;
  aside?: ReactNode;
}

/** A labelled box in the template's diagram style (blue = TS side, orange = output). */
export function Pane({ label, tone = "slate", className, children, aside }: PaneProps) {
  return (
    <section className={`demo-pane demo-pane--${tone} ${className ?? ""}`}>
      <header className="demo-pane__label">
        <span>{label}</span>
        {aside}
      </header>
      <div className="demo-pane__body">{children}</div>
    </section>
  );
}

/** The text received so far, with a caret at the frontier; follows the end. */
export function SourceView({ snapshot, upcoming }: { snapshot: PlayerSnapshot; upcoming?: string }) {
  const ref = useRef<HTMLPreElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [snapshot.position]);
  return (
    <pre ref={ref} className="demo-source">
      {snapshot.text}
      {snapshot.status !== "done" && <span className="demo-caret" />}
      {upcoming && <span className="demo-source__upcoming">{upcoming}</span>}
    </pre>
  );
}

/** A scrollable box that keeps the newest content in view while streaming. */
export function FollowScroll({ children, deps }: { children: ReactNode; deps: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [deps]);
  return (
    <div ref={ref} className="demo-scroll">
      {children}
    </div>
  );
}
