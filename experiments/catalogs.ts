/**
 * The component catalog of the experiments, declared once per library with
 * the same components, the same props and the same descriptions, so the
 * two prompts differ only in what each library adds around them.
 *
 * Parity choices:
 * - ingenui's prop types have no string enums, so the json-render side also
 *   takes `tone` / `variant` as plain strings (the allowed values are in the
 *   description on both sides). Neither validator checks them.
 * - Text: ingenui puts it in children (JSX), json-render in a `text` /
 *   `label` prop (a JSON spec has no text children). That difference is
 *   the point of the comparison, so it stays.
 * - Actions: a fixed set on both sides (ingenui's dynamic actions are off,
 *   json-render's catalog only knows declared actions).
 */
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { defineGenUiSchema } from "ingenui/schema";
import { z } from "zod";

const TONE = 'One of "neutral" | "info" | "success" | "warning".';
const CALLOUT_TONE = 'One of "info" | "warning".';
const VARIANT = 'One of "primary" | "ghost".';

const descriptions = {
  Card: "A bordered panel grouping related content.",
  CardHeader: "The header row of a Card (a Title and Badges).",
  CardBody: "The body of a Card.",
  Title: "A heading.",
  Text: "A paragraph of text.",
  Badge: `A small status pill. tone: ${TONE}`,
  Button: `A button. variant: ${VARIANT}`,
  Avatar: "A round avatar showing initials, with the person's name.",
  Stat: "A big number (value) with a caption (label).",
  Row: "Lays its children out horizontally.",
  List: "A bulleted list of Items.",
  Item: "One List entry.",
  Callout: `A highlighted note. tone: ${CALLOUT_TONE}`,
} as const;

const actions = {
  addToCart: { description: "Add the product shown in the UI to the user's cart." },
  showDetails: { description: "Show more details about the item the UI is about." },
  contactSupport: { description: "Open a support conversation about the UI's subject." },
  choosePlan: { description: "Select the plan the UI offers." },
  retry: { description: "Retry the failed operation." },
} as const;

export const actionNames = Object.keys(actions);

export const genUiSchema = defineGenUiSchema({
  components: {
    Card: { props: {}, description: descriptions.Card },
    CardHeader: { props: {}, description: descriptions.CardHeader },
    CardBody: { props: {}, description: descriptions.CardBody },
    Title: { props: {}, description: descriptions.Title },
    Text: { props: {}, description: descriptions.Text },
    Badge: { props: { tone: "string" }, description: descriptions.Badge },
    Button: {
      props: { variant: "string", onClick: "function" },
      description: `${descriptions.Button} Wire onClick to an action.`,
    },
    Avatar: { props: { initials: "string", name: "string" }, description: descriptions.Avatar },
    Stat: { props: { label: "string", value: "node" }, description: descriptions.Stat },
    Row: { props: {}, description: descriptions.Row },
    List: { props: {}, description: descriptions.List },
    Item: { props: {}, description: descriptions.Item },
    Callout: { props: { tone: "string" }, description: descriptions.Callout },
  },
  actions,
  dynamicActions: false,
});

const empty = z.object({});

export const jsonRenderCatalog = defineCatalog(schema, {
  components: {
    Card: { props: empty, description: descriptions.Card },
    CardHeader: { props: empty, description: descriptions.CardHeader },
    CardBody: { props: empty, description: descriptions.CardBody },
    Title: { props: z.object({ text: z.string() }), description: descriptions.Title },
    Text: { props: z.object({ text: z.string() }), description: descriptions.Text },
    Badge: {
      props: z.object({ label: z.string(), tone: z.string().nullable() }),
      description: descriptions.Badge,
    },
    Button: {
      props: z.object({ label: z.string(), variant: z.string().nullable() }),
      description: `${descriptions.Button} Bind on.press to an action.`,
    },
    Avatar: {
      props: z.object({ initials: z.string(), name: z.string() }),
      description: descriptions.Avatar,
    },
    Stat: {
      props: z.object({ label: z.string(), value: z.union([z.string(), z.number()]) }),
      description: descriptions.Stat,
    },
    Row: { props: empty, description: descriptions.Row },
    List: { props: empty, description: descriptions.List },
    Item: { props: z.object({ text: z.string() }), description: descriptions.Item },
    Callout: {
      props: z.object({ text: z.string(), tone: z.string().nullable() }),
      description: descriptions.Callout,
    },
  },
  actions,
});
