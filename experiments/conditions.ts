/** Model settings the experiments run under. */
export interface Condition {
  id: string;
  model: string;
  effort: "low" | "medium" | "high";
  /** `false` sends thinking: {type: "disabled"} (Haiku 5.5 allows it at effort ≤ high). */
  thinking: boolean;
}

export const conditions: readonly Condition[] = [
  { id: "haiku-nothink", model: "claude-haiku-5-5", effort: "low", thinking: false },
  { id: "haiku-low", model: "claude-haiku-5-5", effort: "low", thinking: true },
  { id: "sonnet-low", model: "claude-sonnet-5-5", effort: "low", thinking: true },
  { id: "opus-low", model: "claude-opus-5-5", effort: "low", thinking: true },
];

/** $ per million tokens (input, output), prompts ≤ 100K tokens. */
export const pricing: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};
