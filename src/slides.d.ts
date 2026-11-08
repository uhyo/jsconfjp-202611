declare module "*.md" {
  const slides: import("./deck/types").Slide[];
  export default slides;
}

/**
 * Where `<ClaudeChatDemo>` sends `/api/*`: `""` (same origin, proxied) in
 * dev, `INGENUI_DEMO_URL` in a production build. See `vite.config.ts`.
 */
declare const __INGENUI_API_ORIGIN__: string;
