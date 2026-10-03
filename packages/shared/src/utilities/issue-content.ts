import { z } from "zod";

const ISSUE_CONTENT_VERSION = 1;
const ISSUE_CONTENT_TEXT_MAX = 20_000;
/*
 * A stored description was at most 5,000 characters. Turning each line into a
 * paragraph must still pass these limits, including a description made of
 * newlines and a description whose JSON escapes Unicode.
 */
const ISSUE_CONTENT_JSON_MAX_BYTES = 1_500_000;
const ISSUE_CONTENT_NODE_MAX = 12_000;
const ISSUE_CONTENT_DEPTH_MAX = 12;
const ISSUE_CONTENT_EXCERPT_MAX = 200;
const ISSUE_CONTENT_TEXT_FORMAT_MASK = 19;

const elementFormatSchema = z.enum(["", "left", "start", "center", "right", "end", "justify"]);
const directionSchema = z.enum(["ltr", "rtl"]).nullable();

const textNodeSchema = z
  .strictObject({
    detail: z.number().int().min(0).max(3),
    format: z.number().int().min(0).max(ISSUE_CONTENT_TEXT_FORMAT_MASK),
    mode: z.literal("normal"),
    style: z.literal(""),
    text: z.string().max(ISSUE_CONTENT_TEXT_MAX),
    type: z.literal("text"),
    version: z.literal(1),
  })
  .refine((node) => (node.format & ISSUE_CONTENT_TEXT_FORMAT_MASK) === node.format, {
    message: "This text format is not supported.",
  });

const lineBreakNodeSchema = z.strictObject({
  type: z.literal("linebreak"),
  version: z.literal(1),
});

const tabNodeSchema = z.strictObject({
  type: z.literal("tab"),
  version: z.literal(1),
});

const elementFields = {
  direction: directionSchema,
  format: elementFormatSchema,
  indent: z.number().int().min(0).max(8),
  textFormat: z.number().int().min(0).max(ISSUE_CONTENT_TEXT_FORMAT_MASK).optional(),
  textStyle: z.literal("").optional(),
  version: z.literal(1),
};

const linkChildSchema = z.discriminatedUnion("type", [textNodeSchema, lineBreakNodeSchema]);

const linkNodeSchema = z
  .strictObject({
    ...elementFields,
    children: z.array(linkChildSchema).max(ISSUE_CONTENT_NODE_MAX),
    rel: z.string().max(100).nullable(),
    target: z.enum(["_blank", "_self"]).nullable(),
    title: z.string().max(200).nullable(),
    type: z.literal("link"),
    url: z.string().min(1).max(2_000),
  })
  .refine((node) => isSafeIssueLink(node.url), { message: "This link is not allowed." })
  .refine(
    (node) =>
      node.textFormat === undefined ||
      (node.textFormat & ISSUE_CONTENT_TEXT_FORMAT_MASK) === node.textFormat,
    { message: "This text format is not supported." },
  );

const inlineNodeSchema = z.discriminatedUnion("type", [
  textNodeSchema,
  lineBreakNodeSchema,
  linkNodeSchema,
]);

const paragraphNodeSchema = z
  .strictObject({
    ...elementFields,
    children: z.array(inlineNodeSchema).max(ISSUE_CONTENT_NODE_MAX),
    type: z.literal("paragraph"),
  })
  .refine(
    (node) =>
      node.textFormat === undefined ||
      (node.textFormat & ISSUE_CONTENT_TEXT_FORMAT_MASK) === node.textFormat,
  );

const headingNodeSchema = z
  .strictObject({
    ...elementFields,
    children: z.array(inlineNodeSchema).max(ISSUE_CONTENT_NODE_MAX),
    tag: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]),
    type: z.literal("heading"),
  })
  .refine(
    (node) =>
      node.textFormat === undefined ||
      (node.textFormat & ISSUE_CONTENT_TEXT_FORMAT_MASK) === node.textFormat,
  );

const quoteNodeSchema = z
  .strictObject({
    ...elementFields,
    children: z.array(inlineNodeSchema).max(ISSUE_CONTENT_NODE_MAX),
    type: z.literal("quote"),
  })
  .refine(
    (node) =>
      node.textFormat === undefined ||
      (node.textFormat & ISSUE_CONTENT_TEXT_FORMAT_MASK) === node.textFormat,
  );

const codeNodeSchema = z
  .strictObject({
    ...elementFields,
    children: z
      .array(z.discriminatedUnion("type", [textNodeSchema, lineBreakNodeSchema, tabNodeSchema]))
      .max(ISSUE_CONTENT_NODE_MAX),
    language: z.string().max(32).nullable(),
    theme: z
      .string()
      .max(40)
      .regex(/^[a-z0-9-]*$/)
      .optional(),
    type: z.literal("code"),
  })
  .refine(
    (node) =>
      node.textFormat === undefined ||
      (node.textFormat & ISSUE_CONTENT_TEXT_FORMAT_MASK) === node.textFormat,
  );

type IssueContentListNode = {
  children: IssueContentListItemNode[];
  direction: "ltr" | "rtl" | null;
  format: "" | "left" | "start" | "center" | "right" | "end" | "justify";
  indent: number;
  listType: "bullet" | "number" | "check";
  start: number;
  tag: "ol" | "ul";
  textFormat?: number;
  textStyle?: "";
  type: "list";
  version: 1;
};

type IssueContentListItemNode = {
  checked?: boolean | null;
  children: Array<
    z.infer<typeof inlineNodeSchema> | z.infer<typeof paragraphNodeSchema> | IssueContentListNode
  >;
  direction: "ltr" | "rtl" | null;
  format: "" | "left" | "start" | "center" | "right" | "end" | "justify";
  indent: number;
  textFormat?: number;
  textStyle?: "";
  type: "listitem";
  value: number;
  version: 1;
};

const listNodeSchema: z.ZodType<IssueContentListNode> = z.lazy(() =>
  z
    .strictObject({
      ...elementFields,
      children: z.array(listItemNodeSchema).max(ISSUE_CONTENT_NODE_MAX),
      listType: z.enum(["bullet", "number", "check"]),
      start: z.number().int().min(1).max(9_999),
      tag: z.enum(["ol", "ul"]),
      type: z.literal("list"),
    })
    .refine(
      (node) =>
        node.textFormat === undefined ||
        (node.textFormat & ISSUE_CONTENT_TEXT_FORMAT_MASK) === node.textFormat,
    ),
);

const listItemNodeSchema: z.ZodType<IssueContentListItemNode> = z.lazy(() =>
  z
    .strictObject({
      ...elementFields,
      checked: z.boolean().nullable().optional(),
      children: z
        .array(z.union([inlineNodeSchema, paragraphNodeSchema, listNodeSchema]))
        .max(ISSUE_CONTENT_NODE_MAX),
      type: z.literal("listitem"),
      value: z.number().int().min(0).max(9_999),
    })
    .refine(
      (node) =>
        node.textFormat === undefined ||
        (node.textFormat & ISSUE_CONTENT_TEXT_FORMAT_MASK) === node.textFormat,
    ),
);

const blockNodeSchema = z.union([
  paragraphNodeSchema,
  headingNodeSchema,
  quoteNodeSchema,
  listNodeSchema,
  codeNodeSchema,
]);

const issueContentDocumentSchema = z
  .strictObject({
    root: z.strictObject({
      ...elementFields,
      children: z.array(blockNodeSchema).max(ISSUE_CONTENT_NODE_MAX),
      type: z.literal("root"),
    }),
    version: z.literal(ISSUE_CONTENT_VERSION),
  })
  .superRefine((document, context) => {
    const counted = countIssueContent(document.root, 1);

    if (counted.nodes > ISSUE_CONTENT_NODE_MAX) {
      context.addIssue({
        code: "custom",
        message: "The issue content is too large.",
        path: ["root"],
      });
    }

    if (counted.depth > ISSUE_CONTENT_DEPTH_MAX) {
      context.addIssue({
        code: "custom",
        message: "The issue content is nested too deeply.",
        path: ["root"],
      });
    }

    if (counted.text.length > ISSUE_CONTENT_TEXT_MAX) {
      context.addIssue({
        code: "custom",
        message: "The issue content is too long.",
        path: ["root"],
      });
    }

    if (utf8Size(JSON.stringify(document)) > ISSUE_CONTENT_JSON_MAX_BYTES) {
      context.addIssue({
        code: "custom",
        message: "The issue content is too large.",
        path: ["root"],
      });
    }
  });

type IssueContentDocument = z.infer<typeof issueContentDocumentSchema>;
type IssueContentBlock = z.infer<typeof blockNodeSchema>;

interface IssueContentCount {
  depth: number;
  nodes: number;
  text: string;
}

function hasUnsafeLinkCharacters(value: string): boolean {
  if (/\s/.test(value)) {
    return true;
  }

  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;

    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }

  return false;
}

function isSafeIssueLink(url: string): boolean {
  const trimmed = url.trim();

  if (trimmed.length === 0 || hasUnsafeLinkCharacters(trimmed)) {
    return false;
  }

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);

  if (scheme === null) {
    return false;
  }

  return (
    scheme[1]?.toLowerCase() === "http" ||
    scheme[1]?.toLowerCase() === "https" ||
    scheme[1]?.toLowerCase() === "mailto"
  );
}

function utf8Size(value: string): number {
  const Encoder = (globalThis as { TextEncoder?: new () => { encode(input: string): Uint8Array } })
    .TextEncoder;

  if (Encoder === undefined) {
    return value.length;
  }

  return new Encoder().encode(value).length;
}

function countIssueContent(node: unknown, depth: number): IssueContentCount {
  if (typeof node !== "object" || node === null || !("type" in node)) {
    return { depth, nodes: 1, text: "" };
  }

  const record = node as { children?: unknown; text?: unknown; type?: unknown };
  const ownText = record.type === "text" && typeof record.text === "string" ? record.text : "";
  const tab = record.type === "tab" ? "\t" : "";
  const lineBreak = record.type === "linebreak" ? "\n" : "";
  let nodes = 1;
  let maxDepth = depth;
  let text = `${ownText}${tab}${lineBreak}`;

  if (Array.isArray(record.children)) {
    const childTexts: string[] = [];

    for (const child of record.children) {
      const counted = countIssueContent(child, depth + 1);
      nodes += counted.nodes;
      maxDepth = Math.max(maxDepth, counted.depth);
      childTexts.push(counted.text);
    }

    text += childTexts.join("");
  }

  return { depth: maxDepth, nodes, text };
}

function blockText(node: IssueContentBlock | IssueContentListItemNode): string {
  return countIssueContent(node, 1).text;
}

function issueContentText(document: IssueContentDocument): string {
  return document.root.children.map((child) => blockPlainText(child)).join("\n");
}

function blockPlainText(node: IssueContentBlock): string {
  if (node.type === "list") {
    return node.children.map((item) => listItemPlainText(item)).join("\n");
  }

  return blockText(node);
}

function listItemPlainText(item: IssueContentListItemNode): string {
  const parts: string[] = [];
  let inline = "";

  for (const child of item.children) {
    if (child.type === "list") {
      if (inline.length > 0) {
        parts.push(inline);
        inline = "";
      }

      parts.push(blockPlainText(child));
      continue;
    }

    if (child.type === "paragraph") {
      if (inline.length > 0) {
        parts.push(inline);
        inline = "";
      }

      parts.push(blockText(child));
      continue;
    }

    inline += countIssueContent(child, 1).text;
  }

  if (inline.length > 0) {
    parts.push(inline);
  }

  return parts.join("\n");
}

function issueContentExcerpt(text: string): string {
  return text.length <= ISSUE_CONTENT_EXCERPT_MAX ? text : text.slice(0, ISSUE_CONTENT_EXCERPT_MAX);
}

function emptyIssueContentDocument(): IssueContentDocument {
  return {
    root: {
      children: [],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
    version: ISSUE_CONTENT_VERSION,
  };
}

function issueContentFromPlainText(value: string): IssueContentDocument | null {
  const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");

  if (normalized.length === 0) {
    return null;
  }

  return {
    root: {
      children: normalized.split("\n").map((line) => ({
        children:
          line.length === 0
            ? []
            : [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal" as const,
                  style: "" as const,
                  text: line,
                  type: "text" as const,
                  version: 1 as const,
                },
              ],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph" as const,
        version: 1 as const,
      })),
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
    version: ISSUE_CONTENT_VERSION,
  };
}

function normalizeIssueContent(document: IssueContentDocument): IssueContentDocument | null {
  return issueContentText(document).length === 0 ? null : document;
}

function prepareIssueContent(document: IssueContentDocument | null): {
  content: IssueContentDocument | null;
  contentText: string;
} {
  if (document === null) {
    return { content: null, contentText: "" };
  }

  const content = normalizeIssueContent(document);

  return {
    content,
    contentText: content === null ? "" : issueContentText(content),
  };
}

export {
  ISSUE_CONTENT_DEPTH_MAX,
  ISSUE_CONTENT_EXCERPT_MAX,
  ISSUE_CONTENT_JSON_MAX_BYTES,
  ISSUE_CONTENT_NODE_MAX,
  ISSUE_CONTENT_TEXT_FORMAT_MASK,
  ISSUE_CONTENT_TEXT_MAX,
  ISSUE_CONTENT_VERSION,
  emptyIssueContentDocument,
  isSafeIssueLink,
  issueContentDocumentSchema,
  listItemNodeSchema as issueContentListItemNodeSchema,
  listNodeSchema as issueContentListNodeSchema,
  issueContentExcerpt,
  issueContentFromPlainText,
  issueContentText,
  normalizeIssueContent,
  prepareIssueContent,
  type IssueContentDocument,
  type IssueContentListItemNode,
  type IssueContentListNode,
};
