# CLAUDE.md

HTML slides (Vite + React + MDX) for a JSConf JP 2026 talk about ingenui, with
live demos of ingenui and json-render. See [README.md](./README.md) for usage
and the authoring format.

## Layout

| Path | Role |
| ---- | ---- |
| `slides.md` | The deck. `---`-separated slides, optional YAML frontmatter, HTML comments = speaker notes. Compiled per slide as MDX. |
| `plugins/split.ts` | Pure splitter: deck text → slides (frontmatter, body, notes, title). Fence-aware. |
| `plugins/slides.ts` | Vite plugin: `import slides from "./slides.md"`. One virtual module per slide (`slides.md?slide=N`, MDX + Shiki at build time; a broken slide renders its error in dev). The deck module self-accepts HMR and dispatches `slides:update`. |
| `src/deck/` | Runtime: `Deck.tsx` (audience / `?presenter` / `?print` views), `SlideView.tsx` (1280×720 slide + scaling), `navigation.ts` (hash, keys, BroadcastChannel sync), `Overview.tsx`, `Presenter.tsx`, `deck.css` (template design + layouts). |
| `src/components.ts` | Components usable in slides without importing. |
| `src/demos/` | Demos. `player.ts` (controllable fake LLM stream), `ui.tsx` (shared UI kit), `ingenui-catalog.tsx` / `json-render-catalog.tsx` (adapters), `*Demo.tsx`, `samples.ts`. |

## Conventions

- Slides are 1280×720 px; the template is 960×540 pt, so 1pt = 4/3 px.
  Template colors are CSS variables at the top of `deck.css`.
- ingenui and `@ingenui/incremental-jsx-parser` are npm dependencies. Use
  only their public entries (`ingenui`, `ingenui/react`, `ingenui/schema`,
  `ingenui/server`, `@ingenui/incremental-jsx-parser{,/react,/core}`).
- No `<StrictMode>`: demos hand one-shot `ReadableStream`s to the libraries.
- Demos must render a sensible final state when `useSlideContext().mode` is
  not `"main"` (overview, presenter, print) — `useStreamPlayer` does this by
  completing the stream instantly.
- MDX is forced (`format: "mdx"`) — with a `.md` path MDX would otherwise
  parse plain Markdown and drop JSX.

## Checks

```sh
pnpm typecheck && pnpm build
```
