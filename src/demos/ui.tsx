/**
 * The demo UI kit: plain presentational components, shared by both
 * libraries so the comparison shows the same pixels. The ingenui catalog
 * (`ingenui-catalog.tsx`) and the json-render registry
 * (`json-render-catalog.tsx`) are thin adapters over these.
 */
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type Tone = "neutral" | "info" | "success" | "warning";

/**
 * Set by compact inline components (Badge, Button) while they stream, so
 * the frontier placeholder inside them renders nothing — a full-width
 * shimmer would make them longer than they will finally be.
 */
export const HidePendingContext = createContext(false);

/** The frontier placeholder: a shimmering bar where content is still arriving. */
export function Shimmer() {
  if (useContext(HidePendingContext)) return null;
  return <span className="ui-shimmer" aria-label="loading" />;
}

interface Children {
  children?: ReactNode;
}

export function Card({ pending = false, children }: Children & { pending?: boolean }) {
  return (
    <div className={`ui-card${pending ? " is-pending" : ""}`} aria-busy={pending}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: Children) {
  return <div className="ui-card__header">{children}</div>;
}

export function CardBody({ children }: Children) {
  return <div className="ui-card__body">{children}</div>;
}

export function Title({ children }: Children) {
  return <h3 className="ui-title">{children}</h3>;
}

export function Text({ children }: Children) {
  return <p className="ui-text">{children}</p>;
}

export function Badge({ tone = "neutral", pending = false, children }: Children & { tone?: string; pending?: boolean }) {
  return (
    <span className={`ui-badge ui-badge--${tone}${pending ? " is-pending" : ""}`}>
      <HidePendingContext value={pending}>{children}</HidePendingContext>
    </span>
  );
}

export function Button({
  variant = "primary",
  pending = false,
  onClick,
  children,
}: Children & { variant?: string; pending?: boolean; onClick?: (() => void) | undefined }) {
  // Disabled until its label has fully arrived: a half-streamed button
  // can't be clicked.
  return (
    <button
      className={`ui-button ui-button--${variant}`}
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
    >
      <HidePendingContext value={pending}>{children}</HidePendingContext>
    </button>
  );
}

export function Stat({ label, value }: { label?: ReactNode; value?: ReactNode }) {
  return (
    <div className="ui-stat">
      <span className="ui-stat__value">{value}</span>
      <span className="ui-stat__label">{label}</span>
    </div>
  );
}

export function Row({ children }: Children) {
  return <div className="ui-row">{children}</div>;
}

export function List({ children }: Children) {
  return <ul className="ui-list">{children}</ul>;
}

export function Item({ children }: Children) {
  return <li className="ui-item">{children}</li>;
}

export function Callout({ tone = "info", children }: Children & { tone?: string }) {
  return <div className={`ui-callout ui-callout--${tone}`}>{children}</div>;
}
