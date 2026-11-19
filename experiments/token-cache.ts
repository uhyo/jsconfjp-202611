/** results/tokens.json: token counts by model + text hash (written by count.ts). */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const tokenCachePath = join(dirname(fileURLToPath(import.meta.url)), "results", "tokens.json");

export const tokenKey = (model: string, text: string) =>
  `${model}:${createHash("sha256").update(text).digest("hex").slice(0, 16)}`;

export function loadTokenCache(): Record<string, number> {
  return existsSync(tokenCachePath) ? JSON.parse(readFileSync(tokenCachePath, "utf8")) : {};
}
