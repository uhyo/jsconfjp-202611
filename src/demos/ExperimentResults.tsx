/**
 * Results of the json-render vs ingenui experiments (`experiments/`), read
 * from `experiments/results/summary.json` so the slides always show the
 * committed data. Regenerate with `pnpm exp:report`.
 *
 * - `actual-ui`: UI tokens of the actual successful responses of each
 *   format, per task (each format's own output for the same request).
 * - `same-ui`: tokens of one UI written as JSX vs as a SpecStream, per task
 *   (every valid ui+jsx block from the runs, converted).
 * - `per-request`: what one request costs in each format (input prompt,
 *   output, latency, price) for one model condition.
 * - `success`: success rate per model condition and format.
 */
import type { ReactNode } from "react";

import summary from "../../experiments/results/summary.json";

type Format = "ingenui" | "json-render";
const FORMATS: Format[] = ["ingenui", "json-render"];

const TASK_LABELS: Record<string, string> = {
  product: "商品カード",
  dashboard: "ダッシュボード",
  profile: "プロフィール",
  order: "注文状況",
  weather: "天気予報",
  plans: "料金プラン比較",
  team: "メンバー一覧",
  incident: "障害レポート",
};

const CONDITION_LABELS: Record<string, string> = {
  "haiku-nothink": "Haiku 5.5（思考なし）",
  "haiku-low": "Haiku 5.5（effort: low）",
  "sonnet-low": "Sonnet 5.5（effort: low）",
  "opus-low": "Opus 5.5（effort: low）",
};

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** How much smaller ingenui's value is than json-render's, e.g. `−64%`. */
const reduction = (ingenui: number, jsonRender: number) => `−${Math.round((1 - ingenui / jsonRender) * 100)}%`;

/** The same, from a json-render / ingenui ratio. */
const reductionFromRatio = (ratio: number) => reduction(1, ratio);

export interface ExperimentResultsProps {
  view: "actual-ui" | "same-ui" | "per-request" | "success";
  /** For `per-request`: a condition id (default `haiku-low`). */
  condition?: string;
}

export function ExperimentResults({ view, condition = "haiku-low" }: ExperimentResultsProps) {
  if (view === "actual-ui") return <ActualUi />;
  if (view === "same-ui") return <SameUi />;
  if (view === "per-request") return <PerRequest condition={condition} />;
  return <Success />;
}

function Legend() {
  return (
    <div className="exp-legend">
      {FORMATS.map((f) => (
        <span key={f} className="exp-legend__item">
          <span className={`exp-swatch exp-swatch--${f}`} />
          {f === "ingenui" ? "ingenui（JSX）" : "json-render（SpecStream）"}
        </span>
      ))}
    </div>
  );
}

/** One horizontal bar with its value at the tip. */
function Bar({ format, value, max, label }: { format: Format; value: number; max: number; label: string }) {
  return (
    <div className="exp-bar" title={`${format}: ${label}`}>
      <div className={`exp-bar__fill exp-bar__fill--${format}`} style={{ width: `${(value / max) * 100}%` }} />
      <span className="exp-bar__value">{label}</span>
    </div>
  );
}

/** Per-task pairs of bars (ingenui, json-render) on one shared scale. */
function TaskBars({ rows, note }: { rows: [task: string, jsx: number, spec: number][]; note: ReactNode }) {
  const max = Math.max(...rows.map(([, , spec]) => spec));
  return (
    <div className="exp">
      <Legend />
      <div className="exp-groups">
        {rows.map(([task, jsx, spec]) => (
          <div key={task} className="exp-group">
            <div className="exp-group__label">{TASK_LABELS[task] ?? task}</div>
            <div className="exp-group__bars">
              <Bar format="ingenui" value={jsx} max={max} label={fmt(jsx)} />
              <Bar format="json-render" value={spec} max={max} label={fmt(spec)} />
            </div>
            <div className="exp-group__ratio">{reduction(jsx, spec)}</div>
          </div>
        ))}
      </div>
      <div className="exp-note">{note}</div>
    </div>
  );
}

function ActualUi() {
  const { actualUi } = summary;
  return (
    <TaskBars
      rows={Object.entries(actualUi.byTask).map(([task, v]) => [task, v.ingenui, v["json-render"]])}
      note={
        <>
          成功した実際の応答（ingenui {actualUi.responses.ingenui}件、json-render {actualUi.responses["json-render"]}
          件）のUI部分の平均トークン数。ingenuiは全体で<strong>{reductionFromRatio(actualUi.ratio)}</strong>
        </>
      }
    />
  );
}

function SameUi() {
  return (
    <TaskBars
      rows={Object.entries(summary.sameUi.byTask)
        .filter(([, v]) => v.blocks > 0)
        .map(([task, v]) => [task, v.jsx, v.spec])}
      note={
        <>
          実際の出力 {summary.sameUi.blocks} ブロックを同じ画面のSpecStreamに変換して比較（平均トークン数）。ingenuiは合計で
          <strong>{reductionFromRatio(summary.sameUi.ratio)}</strong>
        </>
      }
    />
  );
}

function PerRequest({ condition }: { condition: string }) {
  const cells = Object.fromEntries(
    summary.cells.filter((c) => c.condition === condition).map((c) => [c.format, c]),
  ) as Partial<Record<Format, (typeof summary.cells)[number]>>;
  const a = cells.ingenui;
  const b = cells["json-render"];
  if (!a || !b) return <div>no data for {condition}</div>;
  const sp = summary.staticTokens.systemPrompt;
  const panels: { title: ReactNode; values: [number, number]; show: (n: number) => string }[] = [
    {
      title: "システムプロンプト",
      values: [sp.ingenui.tokens, sp["json-render"].tokens],
      show: fmt,
    },
    { title: "出力トークン（平均）", values: [a.outputTokensMean, b.outputTokensMean], show: fmt },
    {
      title: "応答時間（中央値）",
      values: [a.latencyMsMedian / 1000, b.latencyMsMedian / 1000],
      show: (n) => `${n.toFixed(1)} 秒`,
    },
    {
      title: "1リクエストの料金",
      values: [a.costPerRequest * 1000, b.costPerRequest * 1000],
      show: (n) => `$${n.toFixed(2)} / 1000回`,
    },
  ];
  return (
    <div className="exp exp--panels">
      <Legend />
      <div className="exp-panels">
        {panels.map((p, i) => {
          const max = Math.max(...p.values);
          return (
            <div key={i} className="exp-panel">
              <div className="exp-panel__title">
                {p.title}
                <span className="exp-panel__ratio">{reduction(p.values[0], p.values[1])}</span>
              </div>
              {FORMATS.map((f, j) => (
                <Bar key={f} format={f} value={p.values[j]!} max={max} label={p.show(p.values[j]!)} />
              ))}
            </div>
          );
        })}
      </div>
      <div className="exp-note">{CONDITION_LABELS[condition] ?? condition}、8種類のUI × 20回ずつ</div>
    </div>
  );
}

function Success() {
  const conditions = [...new Set(summary.cells.map((c) => c.condition))];
  const cell = (condition: string, f: Format) => summary.cells.find((c) => c.condition === condition && c.format === f);
  return (
    <table className="exp-table">
      <thead>
        <tr>
          <th>モデル</th>
          {FORMATS.map((f) => (
            <th key={f}>
              <span className={`exp-swatch exp-swatch--${f}`} /> {f}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {conditions.map((condition) => (
          <tr key={condition}>
            <td>{CONDITION_LABELS[condition] ?? condition}</td>
            {FORMATS.map((f) => {
              const c = cell(condition, f);
              return (
                <td key={f} className="exp-table__num">
                  {c ? (
                    <>
                      <strong>{Math.round(c.success * 100)}%</strong>{" "}
                      <span className="exp-table__n">
                        {Math.round(c.success * c.n)}/{c.n}
                      </span>
                    </>
                  ) : (
                    "–"
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
