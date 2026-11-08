/**
 * The json-render side of the demos: the same UI kit as the ingenui catalog,
 * declared as a json-render catalog (Zod props) and registry. Text lives in
 * props (`text`, `label`) because a JSON spec has no text children.
 */
import { defineCatalog } from "@json-render/core";
import { defineRegistry } from "@json-render/react";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

import * as ui from "./ui";

const tone = z.enum(["neutral", "info", "success", "warning"]).nullable();

export const catalog = defineCatalog(schema, {
  components: {
    Card: { props: z.object({}), description: "A bordered panel grouping related content." },
    CardHeader: { props: z.object({}), description: "The header row of a Card." },
    CardBody: { props: z.object({}), description: "The body of a Card." },
    Title: { props: z.object({ text: z.string() }), description: "A heading." },
    Text: { props: z.object({ text: z.string() }), description: "A paragraph of text." },
    Badge: {
      props: z.object({ label: z.string(), tone }),
      description: "A small status pill.",
    },
    Button: {
      props: z.object({ label: z.string(), variant: z.enum(["primary", "ghost"]).nullable() }),
      description: "A button. Bind on.press to an action.",
    },
    Stat: {
      props: z.object({ label: z.string(), value: z.union([z.string(), z.number()]) }),
      description: "A big number (value) with a caption (label).",
    },
    Row: { props: z.object({}), description: "Lays its children out horizontally." },
    List: { props: z.object({}), description: "A bulleted list of Items." },
    Item: { props: z.object({ text: z.string() }), description: "One List entry." },
    Callout: {
      props: z.object({ text: z.string(), tone: z.enum(["info", "warning"]).nullable() }),
      description: "A highlighted note.",
    },
  },
  actions: {
    addToCart: { description: "Add the product shown in the UI to the user's cart." },
  },
});

export interface JsonRenderActionLog {
  (name: string, params: unknown): void;
}

/**
 * `loading` is json-render's only streaming signal: whether the *whole spec*
 * is still streaming (there is no per-element completeness).
 */
export function createRegistry(onAction: JsonRenderActionLog) {
  return defineRegistry(catalog, {
    components: {
      Card: ({ children, loading }) => <ui.Card pending={Boolean(loading)}>{children}</ui.Card>,
      CardHeader: ({ children }) => <ui.CardHeader>{children}</ui.CardHeader>,
      CardBody: ({ children }) => <ui.CardBody>{children}</ui.CardBody>,
      Title: ({ props }) => <ui.Title>{props.text}</ui.Title>,
      Text: ({ props }) => <ui.Text>{props.text}</ui.Text>,
      Badge: ({ props }) => <ui.Badge tone={props.tone ?? "neutral"}>{props.label}</ui.Badge>,
      Button: ({ props, emit }) => (
        <ui.Button variant={props.variant ?? "primary"} onClick={() => emit("press")}>
          {props.label}
        </ui.Button>
      ),
      Stat: ({ props }) => <ui.Stat label={props.label} value={props.value} />,
      Row: ({ children }) => <ui.Row>{children}</ui.Row>,
      List: ({ children }) => <ui.List>{children}</ui.List>,
      Item: ({ props }) => <ui.Item>{props.text}</ui.Item>,
      Callout: ({ props }) => <ui.Callout tone={props.tone ?? "info"}>{props.text}</ui.Callout>,
    },
    actions: {
      addToCart: async (params) => onAction("addToCart", params),
    },
  });
}
