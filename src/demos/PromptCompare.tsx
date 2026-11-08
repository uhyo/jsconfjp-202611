/**
 * What each library tells the model: ingenui's `formatGenUiPrompt` and
 * json-render's `catalog.prompt()`, for the same component catalog.
 */
import { formatGenUiPrompt } from "ingenui";

import { Pane } from "./DemoParts";
import { demoSchema } from "./ingenui-catalog";
import { catalog } from "./json-render-catalog";

export interface PromptCompareProps {
  /** Which prompts to show (default: both). */
  only?: "ingenui" | "json-render";
}

export function PromptCompare({ only }: PromptCompareProps) {
  const ingenui = formatGenUiPrompt(demoSchema);
  const jsonRender = catalog.prompt();
  return (
    <div className={`demo-panes ${only ? "demo-panes--single" : ""}`}>
      {only !== "json-render" && (
        <Pane label="ingenui: formatGenUiPrompt(schema)" tone="blue" aside={<Count text={ingenui} />}>
          <pre className="demo-source demo-source--small">{ingenui}</pre>
        </Pane>
      )}
      {only !== "ingenui" && (
        <Pane label="json-render: catalog.prompt()" tone="orange" aside={<Count text={jsonRender} />}>
          <pre className="demo-source demo-source--small">{jsonRender}</pre>
        </Pane>
      )}
    </div>
  );
}

function Count({ text }: { text: string }) {
  return <span className="demo-count">{text.length.toLocaleString()} 文字</span>;
}
