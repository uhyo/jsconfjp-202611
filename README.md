# jsconfjp-202611

Slides for JSConf JP 2026 about [ingenui](https://github.com/uhyo/ingenui), as an
HTML presentation: write slides in Markdown, drop live demos of ingenui (and,
for comparison, [json-render](https://json-render.dev)) in between.

The design follows the TSKaigi Sendai 2026 deck (16:9; pale-blue and
pale-yellow corner triangles; cyan bold for emphasis).

## Setup

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # static site in dist/ (relative paths; host anywhere)
pnpm typecheck
```

ingenui and `@ingenui/incremental-jsx-parser` come from npm; bump them in
`package.json` to show newer releases in the demos.

### The live Claude demo

`<ClaudeChatDemo />` chats with Claude through the server of ingenui's demo
app ([`apps/demo`](https://github.com/uhyo/ingenui/tree/master/apps/demo):
`/api/chat` streams Claude's reply through `pipeGenUi`, `/api/next` builds the
next turn from a clicked action). Point the slides at the deployed Worker
or a local `pnpm dev` of that app:

```sh
# .env.local (gitignored), or the shell
INGENUI_DEMO_URL=https://ingenui-demo.<account>.workers.dev
# or, running ingenui's demo app locally with ANTHROPIC_API_KEY in apps/demo/.env.local:
# INGENUI_DEMO_URL=http://localhost:5174
```

In `pnpm dev` / `pnpm preview` the slides' server proxies `/api` there (so
any server works). A production build (`pnpm build`) bakes the URL in and the
page calls the server directly, which needs the page's origin in the
Worker's `ALLOWED_ORIGINS` (`apps/demo/wrangler.jsonc`; it lists
`https://uhyo.github.io`). A build opened from `localhost` still uses the
proxy, since that's `vite preview`.

The deployed Worker rate-limits chat to 6 messages per minute per IP. The
demo's schema
([`ingenui-catalog.tsx`](./src/demos/ingenui-catalog.tsx)) must stay identical
to the demo app's `genui-schema.ts`, since the server validates with that one.

## Deploying (GitHub Pages)

[`.github/workflows/pages.yml`](./.github/workflows/pages.yml) builds and
publishes the deck to https://uhyo.github.io/jsconfjp-202611/ on every push to
`master`. One-time setup in the repository settings:

1. **Pages → Build and deployment → Source:** GitHub Actions.
2. **Secrets and variables → Actions → Variables:** `INGENUI_DEMO_URL` = the
   deployed ingenui demo server, for the live Claude slide.

## Presenting

| Key | |
| --- | --- |
| → ↓ PageDown Space Enter | next slide |
| ← ↑ PageUp Backspace Shift+Space | previous slide |
| Home / End | first / last |
| number + Enter | go to slide |
| `f` | fullscreen |
| `o` | overview (click a slide to jump) |
| `p` | open the presenter window (notes, next slide, timer) |

- The current slide is in the URL hash (`#12`), so reloads keep the position.
- The presenter window (`?presenter`) and the audience window stay in sync.
  Demos are interactive in the audience window; the presenter window shows
  them in their final state.
- **PDF**: open `?print` and print to PDF (page size 1280×720, no margins,
  background graphics on). Demos are printed in their finished state.

## Writing slides

Everything is in [`slides.md`](./slides.md). Slides are separated by a `---`
line; a slide can start with YAML frontmatter:

```md
---
layout: cover
---

# Title

## Subtitle

2026-11 JSConf JP 2026

---

# A normal slide

Text with **emphasis** (cyan bold, like the template) and *orange emphasis*.

- bullets

<!-- Speaker notes: HTML comments go to the presenter window. -->

---
layout: demo
---

# A demo

<CompareDemo sample="product" />
```

Each slide is compiled as **MDX**, so JSX works inline (`<Columns>`, `<img
className="…" />`, …). Keep in mind MDX's rules: `{` and `<` in text need
escaping (`\{`, `&lt;`), and HTML comments are only allowed as notes (they're
removed before compiling).

### Layouts (`layout:`)

| Layout | |
| --- | --- |
| `default` | title at the top, body below (the first `# heading` is the title) |
| `cover` | centered title block (`#` + `##` + date line) |
| `section` | big section title |
| `center` | a centered statement |
| `demo` | like `default`, but the body extends to the bottom (no page number) |
| `blank` | nothing but the content |

Other frontmatter: `class:` (extra classes: `text-sm`, `code-sm`, `code-xs`),
`pageNumber: false`, `title:` (for the overview).

### Code

Code fences are highlighted with Shiki at build time. ```` ```ui+jsx ````
highlights as JSX. Shiki notation comments work: `// [!code highlight]`,
`// [!code focus]`, `// [!code ++]`, `// [!code --]`.

### Components available in every slide

Registered in [`src/components.ts`](./src/components.ts) (add your own there,
or `import` them at the top of a slide, relative to `slides.md`).

| Component | |
| --- | --- |
| `<Columns ratio="2fr 1fr">` | side-by-side columns (each child is a column) |
| `<Box tone="blue \| orange \| dark" title="…">` | a box in the template's diagram style |
| `<JsxStreamDemo sample="product" />` | the parser alone: streamed JSX → live React tree with the `<Pending />` frontier |
| `<GenUiMessageDemo sample="product" />` | an ingenui message (Markdown + ```` ```ui+jsx ````), actions → next request; `sample="broken"` shows issues and the feedback report |
| `<JsonRenderDemo sample="product" />` | json-render: a SpecStream (JSONL patches) → `<Renderer>` |
| `<CompareDemo sample="product" />` | ingenui and json-render side by side, same UI, same streaming rate |
| `<PromptCompare />` | `formatGenUiPrompt(schema)` vs json-render's `catalog.prompt()` |
| `<ClaudeChatDemo starters={[…]} />` | live chat with Claude via ingenui's demo server (see [above](#the-live-claude-demo)); one-click starter messages, raw reply text on the left |

The demos take `sample` (from [`src/demos/samples.ts`](./src/demos/samples.ts))
or `source` (your own text), plus `autoplay`, `speed`, `showSource={false}`.
Each has ▶ / ⏸, ↺ (restart), ⏭ (finish) and a speed selector. The "model"
is simulated: the sample text is streamed in token-sized chunks through a
`ReadableStream`, exactly what the libraries would get from `fetch().body`.

The UI components used by both libraries are the same
([`src/demos/ui.tsx`](./src/demos/ui.tsx)); the ingenui schema/catalog is in
[`ingenui-catalog.tsx`](./src/demos/ingenui-catalog.tsx) and the json-render
catalog/registry in [`json-render-catalog.tsx`](./src/demos/json-render-catalog.tsx).
