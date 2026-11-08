import { useEffect, useState } from "react";

import { useDeckKeys, useNavigation } from "./navigation";
import { Overview } from "./Overview";
import { Presenter } from "./Presenter";
import { ScaledSlide, SlideView } from "./SlideView";
import type { Slide } from "./types";

/** The deck module's slides, replaced on HMR (see `plugins/slides.ts`). */
function useSlides(initial: Slide[]): Slide[] {
  const [slides, setSlides] = useState(initial);
  useEffect(() => {
    const onUpdate = (event: Event) => setSlides((event as CustomEvent<Slide[]>).detail);
    window.addEventListener("slides:update", onUpdate);
    return () => window.removeEventListener("slides:update", onUpdate);
  }, []);
  return slides;
}

function useDocumentTitle(slides: Slide[]) {
  const deckTitle = slides[0]?.frontmatter.deckTitle ?? slides[0]?.title;
  useEffect(() => {
    if (typeof deckTitle === "string" && deckTitle) document.title = deckTitle;
  }, [deckTitle]);
}

export function Deck({ slides: initial }: { slides: Slide[] }) {
  const slides = useSlides(initial);
  useDocumentTitle(slides);
  const params = new URLSearchParams(location.search);
  if (params.has("print")) return <PrintView slides={slides} />;
  if (params.has("presenter")) return <Presenter slides={slides} />;
  return <AudienceView slides={slides} />;
}

function openPresenter() {
  const url = new URL(location.href);
  url.searchParams.set("presenter", "");
  window.open(url, "jsconfjp-presenter", "width=1280,height=800");
}

function AudienceView({ slides }: { slides: Slide[] }) {
  const total = slides.length;
  const nav = useNavigation(total);
  const [overview, setOverview] = useState(false);

  useDeckKeys({
    next: nav.next,
    prev: nav.prev,
    first: () => nav.goto(0),
    last: () => nav.goto(total - 1),
    goto: nav.goto,
    toggleOverview: () => setOverview((v) => !v),
    openPresenter,
    escape: () => setOverview(false),
  });

  const slide = slides[nav.index];
  return (
    <div className="audience">
      <ScaledSlide>
        {slide && (
          <SlideView key={nav.index} slide={slide} index={nav.index} total={total} mode="main" />
        )}
      </ScaledSlide>
      <div className="progress" style={{ width: `${((nav.index + 1) / total) * 100}%` }} />
      {overview && (
        <Overview
          slides={slides}
          current={nav.index}
          onSelect={(i) => {
            nav.goto(i);
            setOverview(false);
          }}
          onClose={() => setOverview(false)}
        />
      )}
    </div>
  );
}

/** Every slide as a 1280×720 page — open `?print` and print to PDF. */
function PrintView({ slides }: { slides: Slide[] }) {
  return (
    <div className="print">
      {slides.map((slide, i) => (
        <div className="print-page" key={i}>
          <SlideView slide={slide} index={i} total={slides.length} mode="print" />
        </div>
      ))}
    </div>
  );
}
