import { useEffect, useRef } from "react";

import { ScaledSlide, SlideView } from "./SlideView";
import type { Slide } from "./types";

interface OverviewProps {
  slides: Slide[];
  current: number;
  onSelect(index: number): void;
  onClose(): void;
}

/** A grid of every slide (press `o`); click one to jump to it. */
export function Overview({ slides, current, onSelect, onClose }: OverviewProps) {
  const currentRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center" });
    currentRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="overview" role="dialog" aria-label="Slide overview" onClick={onClose}>
      <div className="overview__grid">
        {slides.map((slide, i) => (
          <button
            key={i}
            ref={i === current ? currentRef : undefined}
            type="button"
            className={`overview__item ${i === current ? "is-current" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(i);
            }}
          >
            <ScaledSlide className="overview__thumb">
              <SlideView slide={slide} index={i} total={slides.length} mode="preview" />
            </ScaledSlide>
            <span className="overview__label">
              {i + 1}. {slide.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
