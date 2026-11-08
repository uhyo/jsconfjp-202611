/** Small layout helpers for slide content (usable in `slides.md`). */
import type { ReactNode } from "react";

/**
 * Side-by-side columns. Children are the columns:
 *
 * ```mdx
 * <Columns>
 *   <div>左</div>
 *   <div>右</div>
 * </Columns>
 * ```
 */
export function Columns({ children, ratio }: { children: ReactNode; ratio?: string }) {
  return (
    <div className="columns" style={ratio ? { gridTemplateColumns: ratio } : undefined}>
      {children}
    </div>
  );
}

/**
 * A box in the template's diagram style: `blue` (TypeScript blue), `orange`,
 * or `dark` (a terminal / error panel).
 */
export function Box({
  tone = "blue",
  title,
  children,
}: {
  tone?: "blue" | "orange" | "dark";
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`box box--${tone}`}>
      {title && <div className="box__title">{title}</div>}
      <div className="box__body">{children}</div>
    </div>
  );
}
