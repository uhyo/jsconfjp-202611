/**
 * The ingenui side of the demos: a data-only schema (what the model may
 * write — the same object a server would build the prompt from and
 * validate with) and the components bound to it.
 */
import type { ComponentType, ReactNode } from "react";
import { bindGenUi } from "ingenui";
import { useIsElementComplete } from "ingenui/react";
import { defineGenUiSchema } from "ingenui/schema";

import * as ui from "./ui";

export const demoSchema = defineGenUiSchema({
  components: {
    Card: { props: {}, description: "A bordered panel grouping related content." },
    CardHeader: { props: {}, description: "The header row of a Card (a Title and Badges)." },
    CardBody: { props: {}, description: "The body of a Card." },
    Title: { props: {}, description: "A heading." },
    Text: { props: {}, description: "A paragraph of text." },
    Badge: {
      props: { tone: "string" },
      description: 'A small status pill. tone: "neutral" | "info" | "success" | "warning".',
    },
    Button: {
      props: { variant: "string", onClick: "function" },
      description: 'A button. variant: "primary" | "ghost". Wire onClick to an action.',
    },
    Stat: {
      props: { label: "string", value: "node" },
      description: "A big number (value) with a caption (label).",
    },
    Row: { props: {}, description: "Lays its children out horizontally." },
    List: { props: {}, description: "A bulleted list of Items." },
    Item: { props: {}, description: "One List entry." },
    Callout: {
      props: { tone: "string" },
      description: 'A highlighted note. tone: "info" | "warning".',
    },
  },
  actions: {
    addToCart: { description: "Add the product shown in the UI to the user's cart." },
  },
});

interface Children {
  children?: ReactNode;
}

// Components that react to their own streaming state: `useIsElementComplete`
// is false while the element's children are still arriving.
function Card({ children }: Children) {
  const complete = useIsElementComplete();
  return <ui.Card pending={!complete}>{children}</ui.Card>;
}

function Badge({ tone, children }: Children & { tone?: string }) {
  const complete = useIsElementComplete();
  return (
    <ui.Badge tone={tone} pending={!complete}>
      {children}
    </ui.Badge>
  );
}

function Button({ variant, onClick, children }: Children & { variant?: string; onClick?: () => void }) {
  const complete = useIsElementComplete();
  return (
    <ui.Button variant={variant} onClick={onClick} pending={!complete}>
      {children}
    </ui.Button>
  );
}

export const ingenuiComponents = {
  Card,
  CardHeader: ui.CardHeader,
  CardBody: ui.CardBody,
  Title: ui.Title,
  Text: ui.Text,
  Badge,
  Button,
  Stat: ui.Stat,
  Row: ui.Row,
  List: ui.List,
  Item: ui.Item,
  Callout: ui.Callout,
};

/** `createGenUiMessage` options: the schema with the components bound (type-checked). */
export const genUi = bindGenUi(demoSchema, { components: ingenuiComponents });

/** For the bare parser demos: the catalog doubles as the allowlist. */
export const parserComponents = ingenuiComponents as Record<string, ComponentType<never>>;
