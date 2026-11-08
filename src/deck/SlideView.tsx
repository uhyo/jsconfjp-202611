import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { mdxComponents } from "../components";
import { SlideContext } from "./context";
import type { RenderMode, Slide } from "./types";

/** The slide canvas size; everything inside is laid out in these pixels. */
export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

/** The pale-blue / pale-yellow corner triangles of the template. */
function Decorations() {
  return (
    <svg
      className="slide-decorations"
      viewBox={`0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polygon points="0,0 1280,0 1280,139.2" fill="var(--deco-top)" />
      <polygon points="0,580.8 0,720 1280,720" fill="var(--deco-bottom)" />
    </svg>
  );
}

interface SlideViewProps {
  slide: Slide;
  index: number;
  total: number;
  mode: RenderMode;
}

/** One slide at its native 1280×720 size. */
export function SlideView({ slide, index, total, mode }: SlideViewProps) {
  const { Component, frontmatter } = slide;
  const layout = frontmatter.layout ?? "default";
  // Demos use the whole slide; the number would sit on top of them.
  const showNumber = frontmatter.pageNumber ?? (layout !== "cover" && layout !== "demo");
  return (
    <SlideContext value={{ index, total, mode }}>
      <div
        className={`slide layout-${layout} ${frontmatter.class ?? ""}`}
        data-slide={index + 1}
      >
        {layout !== "blank" && <Decorations />}
        <div className="slide-content">
          <Component components={mdxComponents} />
        </div>
        {showNumber && <div className="page-number">{index + 1}</div>}
      </div>
    </SlideContext>
  );
}

/**
 * Scales its 1280×720 child to fit the box (letterboxed), keeping crisp text
 * by scaling with a transform rather than zooming bitmaps.
 */
export function ScaledSlide({ children, className }: { children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(Math.min(width / SLIDE_WIDTH, height / SLIDE_HEIGHT));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} className={`scaled-slide ${className ?? ""}`}>
      <div
        className="scaled-slide__inner"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          visibility: scale === 0 ? "hidden" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
