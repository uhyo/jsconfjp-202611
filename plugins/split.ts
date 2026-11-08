/**
 * Splits a deck file (Markdown/MDX) into slides — the Slidev-style format:
 *
 * ```md
 * ---
 * layout: cover
 * ---
 *
 * # First slide
 *
 * ---
 *
 * # Second slide
 *
 * <!-- speaker notes -->
 *
 * ---
 * layout: section
 * ---
 *
 * # Third slide (with frontmatter)
 * ```
 *
 * - A line consisting of `---` (outside code fences) separates slides.
 * - A separator directly followed by `key: value` lines and another `---`
 *   gives that slide YAML frontmatter. (So does a block at the very top of
 *   the file, for the first slide.)
 * - HTML comments become the slide's speaker notes (MDX doesn't allow HTML
 *   comments, so they are removed from the body).
 *
 * Pure: no file system, no MDX.
 */
import { parse as parseYaml } from "yaml";

export interface RawSlide {
  /** Parsed YAML frontmatter (`{}` when there is none). */
  frontmatter: Record<string, unknown>;
  /** The Markdown/MDX body, with notes removed. */
  body: string;
  /** Speaker notes (the HTML comments' contents), or `""`. */
  notes: string;
  /** Text of the first `# heading`, for the overview and presenter views. */
  title: string;
  /** 1-based line in the deck file where the slide body starts. */
  line: number;
}

const SEPARATOR = /^---\s*$/;
const FENCE_OPEN = /^\s{0,3}(`{3,}|~{3,})/;
/** A top-level YAML key line (`layout: section`) — not `# heading` etc. */
const YAML_KEY = /^[A-Za-z_$][\w$-]*\s*:(\s|$)/;
const YAML_CONTINUATION = /^\s+\S|^\s*$/;

/**
 * Tracks whether we are inside a fenced code block, line by line, so `---`
 * and `<!-- -->` inside code are left alone.
 */
function createFenceTracker() {
  let open: { char: string; length: number } | null = null;
  return {
    /** Feed a line; returns whether the line is part of a code block. */
    feed(line: string): boolean {
      if (open === null) {
        const match = FENCE_OPEN.exec(line);
        if (match?.[1]) {
          open = { char: match[1][0]!, length: match[1].length };
          return true;
        }
        return false;
      }
      const trimmed = line.trim();
      if (
        trimmed.length >= open.length &&
        [...trimmed].every((c) => c === open!.char)
      ) {
        open = null;
      }
      return true;
    },
  };
}

/**
 * If `lines[start]` begins a frontmatter block (`key: value` lines closed by
 * `---`), returns the parsed data and the index after the closing `---`.
 */
function readFrontmatter(
  lines: readonly string[],
  start: number,
): { data: Record<string, unknown>; next: number } | null {
  let sawKey = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]!;
    if (SEPARATOR.test(line)) {
      if (!sawKey) return null;
      const data: unknown = parseYaml(lines.slice(start, i).join("\n"));
      if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
      return { data: data as Record<string, unknown>, next: i + 1 };
    }
    if (YAML_KEY.test(line)) sawKey = true;
    else if (!(sawKey && YAML_CONTINUATION.test(line)) && line.trim() !== "") return null;
  }
  return null;
}

/** Removes HTML comments outside code fences; returns them as notes. */
function extractNotes(body: string): { body: string; notes: string } {
  const notes: string[] = [];
  const out: string[] = [];
  const fence = createFenceTracker();
  let comment: string[] | null = null;
  for (const line of body.split("\n")) {
    if (comment !== null) {
      const end = line.indexOf("-->");
      if (end === -1) {
        comment.push(line);
        continue;
      }
      comment.push(line.slice(0, end));
      notes.push(comment.join("\n"));
      comment = null;
      const rest = line.slice(end + 3);
      if (rest.trim() !== "") out.push(rest);
      continue;
    }
    if (fence.feed(line)) {
      out.push(line);
      continue;
    }
    let rest = line;
    let kept = "";
    for (;;) {
      const start = rest.indexOf("<!--");
      if (start === -1) {
        kept += rest;
        break;
      }
      kept += rest.slice(0, start);
      const end = rest.indexOf("-->", start + 4);
      if (end === -1) {
        comment = [rest.slice(start + 4)];
        break;
      }
      notes.push(rest.slice(start + 4, end));
      rest = rest.slice(end + 3);
    }
    if (kept.trim() !== "" || kept === line) out.push(kept);
  }
  if (comment !== null) notes.push(comment.join("\n"));
  return {
    body: out.join("\n"),
    notes: notes
      .map((n) => n.trim())
      .filter(Boolean)
      .join("\n\n"),
  };
}

function firstHeading(body: string): string {
  const fence = createFenceTracker();
  for (const line of body.split("\n")) {
    if (fence.feed(line)) continue;
    const match = /^#\s+(.+?)\s*#*\s*$/.exec(line);
    if (match?.[1]) {
      // Strip the most common inline Markdown so the title reads as text.
      return match[1].replace(/[*_`]/g, "").replace(/<[^>]+>/g, "");
    }
  }
  return "";
}

export function splitSlides(source: string): RawSlide[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const slides: RawSlide[] = [];

  let index = 0;
  let frontmatter: Record<string, unknown> = {};
  if (lines[0] !== undefined && SEPARATOR.test(lines[0])) {
    const fm = readFrontmatter(lines, 1);
    if (fm) {
      frontmatter = fm.data;
      index = fm.next;
    }
  }

  let bodyStart = index;
  let body: string[] = [];
  const fence = createFenceTracker();

  const flush = () => {
    const { body: text, notes } = extractNotes(body.join("\n"));
    const trimmed = text.trim();
    // Skip empty slides (e.g. a leading `---` without frontmatter), unless
    // they were given frontmatter on purpose.
    if (trimmed !== "" || Object.keys(frontmatter).length > 0) {
      slides.push({
        frontmatter,
        body: text,
        notes,
        title: typeof frontmatter.title === "string" ? frontmatter.title : firstHeading(text),
        line: bodyStart + 1,
      });
    }
  };

  for (let i = index; i < lines.length; i++) {
    const line = lines[i]!;
    if (!fence.feed(line) && SEPARATOR.test(line)) {
      flush();
      frontmatter = {};
      body = [];
      const fm = readFrontmatter(lines, i + 1);
      if (fm) {
        frontmatter = fm.data;
        i = fm.next - 1;
      }
      bodyStart = i + 1;
      continue;
    }
    body.push(line);
  }
  flush();
  return slides;
}
