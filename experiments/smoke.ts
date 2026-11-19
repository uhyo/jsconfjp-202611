/**
 * Offline self-check of the grader and the converter (no API calls):
 * the slides' hand-written samples must pass, and typical model mistakes
 * must be caught, in both formats.
 *
 *   node experiments/smoke.ts
 */
import assert from "node:assert/strict";

import { jsx, specs } from "../src/demos/samples.ts";
import { jsxToSpecStream } from "./convert.ts";
import { grade } from "./evaluate.ts";
import { tasks } from "./tasks.ts";

const product = tasks.find((t) => t.id === "product")!;
const fence = (body: string) => `こちらです。\n\n\`\`\`ui+jsx\n${body}\n\`\`\`\n`;

// The same UI passes in both notations.
assert.equal((await grade("ingenui", fence(jsx.product), product)).success, true);
assert.equal((await grade("json-render", specs.product, product)).success, true);
const converted = jsxToSpecStream(jsx.product);
assert.ok(converted);
assert.equal((await grade("json-render", converted, product)).success, true);

// Code fences around JSONL still render (counted as extraneous lines only).
const fenced = await grade("json-render", `\`\`\`jsonl\n${specs.product}\`\`\`\n`, product);
assert.equal(fenced.success, true);
assert.equal(fenced.extraneousLines, 2);

// ingenui: unknown component, unknown action, unclosed fence.
const bad = await grade("ingenui", "```ui+jsx\n<Card><Chart /><Button onClick={actions.buy}>x</Button></Card>\n```\n", product);
assert.equal(bad.valid, false);
assert.ok(bad.problems.some((p) => p.includes("Chart")));
assert.ok(bad.problems.some((p) => p.includes("actions.buy")));
assert.equal((await grade("ingenui", "```ui+jsx\n<Card>", product)).valid, false);
assert.equal((await grade("ingenui", "No UI at all.", product)).valid, false);

// json-render: missing child, unknown type, missing prop, unknown action.
const missingChild = specs.product.replace('"children":["text","stats","button"]', '"children":["text","stats","button","nope"]');
assert.equal((await grade("json-render", missingChild, product)).valid, false);
const unknownType = specs.product.replace('"type":"Row"', '"type":"Grid"');
assert.equal((await grade("json-render", unknownType, product)).valid, false);
const missingProp = specs.product.replace('"text":"Aurora', '"txt":"Aurora');
const g = await grade("json-render", missingProp, product);
assert.equal(g.valid, false);
assert.deepEqual(g.missingFacts, ["Aurora"]);
const unknownAction = await grade("json-render", specs.product.replace("addToCart", "buy"), product);
assert.equal(unknownAction.valid, false);
assert.deepEqual(unknownAction.missingActions, ["addToCart"]);

// Content: a missing fact fails content but not validity.
const noPrice = await grade("ingenui", fence(jsx.product.replace("¥24,800", "お手頃")), product);
assert.equal(noPrice.valid, true);
assert.deepEqual(noPrice.missingFacts, ["24,800"]);

console.log("smoke: ok");
