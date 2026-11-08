import { createContext, useContext } from "react";

import type { RenderMode } from "./types";

export interface SlideContextValue {
  /** 0-based slide index. */
  index: number;
  total: number;
  mode: RenderMode;
}

export const SlideContext = createContext<SlideContextValue>({ index: 0, total: 1, mode: "main" });

/** Where the current slide is rendered — demos use it to skip animation in previews. */
export function useSlideContext(): SlideContextValue {
  return useContext(SlideContext);
}
