/**
 * The ingenui side of the demos: a data-only schema (what the model may
 * write — the same object a server would build the prompt from and
 * validate with) and the components bound to it.
 *
 * Keep the schema identical to ingenui's demo app
 * (`apps/demo/src/genui-schema.ts` in uhyo/ingenui): `ClaudeChatDemo` talks
 * to that app's server, which prompts Claude and validates its stream with
 * that schema, so the client must parse with the same one.
 */
import type { ComponentType, FormEvent, ReactNode } from "react";
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
    Avatar: { props: { initials: "string", name: "string" }, description: "A round avatar." },
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
    // Forms: the model asks for input through these components, never raw
    // HTML. Their descriptions tell it the HTML semantics (what the action
    // reports), which is the app's responsibility.
    Form: {
      props: { onSubmit: "function", submitLabel: "string" },
      description:
        "A form (an HTML <form>) ending in a submit button labeled submitLabel. Wire " +
        "onSubmit to an action: on submit, that action reports the value of every " +
        "TextField / Select inside the form, by its name. Use it whenever you need the " +
        "user to type or pick something.",
    },
    TextField: {
      props: {
        name: "string",
        label: "string",
        placeholder: "string",
        defaultValue: "string",
        multiline: "boolean",
        required: "boolean",
      },
      description:
        "A labeled text input (an HTML <input>, or a <textarea> with multiline). Only " +
        "inside a Form; its value is reported under name when the form is submitted. " +
        "required: the form can't be submitted while it is empty.",
    },
    Select: {
      props: { name: "string", label: "string", defaultValue: "string" },
      description:
        "A labeled dropdown (an HTML <select>) whose children are Option elements. Only " +
        "inside a Form; the chosen Option's value is reported under name when the form " +
        "is submitted.",
    },
    Option: {
      props: { value: "string" },
      description:
        "One choice of a Select: value is what gets reported; its children are the label.",
    },
  },
  actions: {
    addToCart: { description: "Add the product shown in the UI to the user's cart." },
  },
  // Dynamic actions (the default): the model may also invent action names.
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

// Submittable only once all its fields have arrived. The submit event goes
// to the `actions.*` function as-is; the fields are uncontrolled, so what
// the user types survives re-renders while the message is still streaming.
function Form({
  onSubmit,
  submitLabel,
  children,
}: Children & { onSubmit?: (event: FormEvent<HTMLFormElement>) => void; submitLabel?: string }) {
  const complete = useIsElementComplete();
  return (
    <ui.Form submitLabel={submitLabel} onSubmit={onSubmit} pending={!complete}>
      {children}
    </ui.Form>
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
  Avatar: ui.Avatar,
  Stat: ui.Stat,
  Row: ui.Row,
  List: ui.List,
  Item: ui.Item,
  Callout: ui.Callout,
  Form,
  TextField: ui.TextField,
  Select: ui.Select,
  Option: ui.Option,
};

/** `createGenUiMessage` options: the schema with the components bound (type-checked). */
export const genUi = bindGenUi(demoSchema, { components: ingenuiComponents });

/** For the bare parser demos: the catalog doubles as the allowlist. */
export const parserComponents = ingenuiComponents as Record<string, ComponentType<never>>;
