import {
  isSafeIssueLink,
  issueContentDocumentSchema,
  prepareIssueContent,
  type IssueContentDocument,
} from "@teamos/shared";

const elementFormats = new Set(["", "left", "start", "center", "right", "end", "justify"]);
const textFormatMask = 19;

interface SanitizedIssueContent {
  content: IssueContentDocument | null;
  error: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function elementBase(node: Record<string, unknown>): Record<string, unknown> {
  const format =
    typeof node.format === "string" && elementFormats.has(node.format) ? node.format : "";
  const direction = node.direction === "ltr" || node.direction === "rtl" ? node.direction : null;
  const indent =
    typeof node.indent === "number" && Number.isInteger(node.indent)
      ? Math.min(8, Math.max(0, node.indent))
      : 0;
  const base: Record<string, unknown> = {
    direction,
    format,
    indent,
    version: 1,
  };

  if (typeof node.textFormat === "number" && Number.isInteger(node.textFormat)) {
    base.textFormat = node.textFormat & textFormatMask;
  }

  if (node.textStyle === "") {
    base.textStyle = "";
  }

  return base;
}

function textNode(node: Record<string, unknown>): Record<string, unknown> | null {
  if (typeof node.text !== "string") {
    return null;
  }

  const detail =
    typeof node.detail === "number" && Number.isInteger(node.detail)
      ? Math.min(3, Math.max(0, node.detail))
      : 0;
  const format =
    typeof node.format === "number" && Number.isInteger(node.format)
      ? node.format & textFormatMask
      : 0;

  return {
    detail,
    format,
    mode: "normal",
    style: "",
    text: node.text,
    type: "text",
    version: 1,
  };
}

function inlineNodes(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((child) => {
    if (!isRecord(child) || typeof child.type !== "string") {
      return [];
    }

    if (child.type === "text" || child.type === "code-highlight") {
      const text = textNode(child);

      return text === null ? [] : [text];
    }

    if (child.type === "linebreak") {
      return [{ type: "linebreak", version: 1 }];
    }

    if (child.type === "link") {
      const url = typeof child.url === "string" ? child.url : "";
      const children = inlineNodes(child.children).filter((item) => item.type !== "link");

      if (!isSafeIssueLink(url)) {
        return children;
      }

      const target = child.target === "_blank" || child.target === "_self" ? child.target : null;

      return [
        {
          ...elementBase(child),
          children,
          rel: typeof child.rel === "string" ? child.rel : null,
          target,
          title: typeof child.title === "string" ? child.title : null,
          type: "link",
          url,
        },
      ];
    }

    return [];
  });
}

function codeChildren(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((child) => {
    if (!isRecord(child) || typeof child.type !== "string") {
      return [];
    }

    if (child.type === "text" || child.type === "code-highlight") {
      const text = textNode(child);

      return text === null ? [] : [text];
    }

    if (child.type === "linebreak") {
      return [{ type: "linebreak", version: 1 }];
    }

    if (child.type === "tab") {
      return [{ type: "tab", version: 1 }];
    }

    return [];
  });
}

function blockNode(node: Record<string, unknown>): Record<string, unknown> | null {
  if (node.type === "paragraph" || node.type === "quote") {
    return {
      ...elementBase(node),
      children: inlineNodes(node.children),
      type: node.type,
    };
  }

  if (node.type === "heading") {
    const tag =
      node.tag === "h1" ||
      node.tag === "h2" ||
      node.tag === "h3" ||
      node.tag === "h4" ||
      node.tag === "h5" ||
      node.tag === "h6"
        ? node.tag
        : "h2";

    return {
      ...elementBase(node),
      children: inlineNodes(node.children),
      tag,
      type: "heading",
    };
  }

  if (node.type === "code") {
    const language = typeof node.language === "string" ? node.language : null;
    const theme =
      typeof node.theme === "string" && /^[a-z0-9-]*$/.test(node.theme) ? node.theme : undefined;

    return {
      ...elementBase(node),
      children: codeChildren(node.children),
      language,
      type: "code",
      ...(theme === undefined ? {} : { theme }),
    };
  }

  if (node.type === "list") {
    const listType =
      node.listType === "number" || node.listType === "check" ? node.listType : "bullet";
    const tag = node.tag === "ol" || listType === "number" ? "ol" : "ul";
    const start =
      typeof node.start === "number" && Number.isInteger(node.start) && node.start > 0
        ? node.start
        : 1;
    const children = Array.isArray(node.children)
      ? node.children.flatMap((child) => {
          if (!isRecord(child) || child.type !== "listitem") {
            return [];
          }

          const value =
            typeof child.value === "number" && Number.isInteger(child.value) && child.value >= 0
              ? child.value
              : 1;
          const checked =
            typeof child.checked === "boolean"
              ? child.checked
              : listType === "check"
                ? false
                : undefined;
          const itemChildren = Array.isArray(child.children)
            ? child.children.flatMap((grand) => {
                if (!isRecord(grand) || typeof grand.type !== "string") {
                  return [];
                }

                if (grand.type === "list") {
                  const nested = blockNode(grand);

                  return nested === null ? [] : [nested];
                }

                if (grand.type === "paragraph") {
                  const paragraph = blockNode(grand);

                  return paragraph === null ? [] : [paragraph];
                }

                return inlineNodes([grand]);
              })
            : [];

          return [
            {
              ...elementBase(child),
              ...(checked === undefined ? {} : { checked }),
              children: itemChildren,
              type: "listitem",
              value,
            },
          ];
        })
      : [];

    return {
      ...elementBase(node),
      children,
      listType,
      start,
      tag: listType === "bullet" || listType === "check" ? "ul" : tag,
      type: "list",
    };
  }

  return null;
}

function sanitizeIssueEditorState(state: unknown): SanitizedIssueContent {
  if (!isRecord(state) || !isRecord(state.root) || !Array.isArray(state.root.children)) {
    return { content: null, error: "This issue content could not be read." };
  }

  const document = {
    root: {
      ...elementBase(state.root),
      children: state.root.children.flatMap((child) => {
        if (!isRecord(child)) {
          return [];
        }

        const block = blockNode(child);

        return block === null ? [] : [block];
      }),
      type: "root",
    },
    version: 1,
  };
  const parsed = issueContentDocumentSchema.safeParse(document);

  if (!parsed.success) {
    return { content: null, error: "This issue content uses formatting that cannot be saved." };
  }

  return { content: prepareIssueContent(parsed.data).content, error: null };
}

export { sanitizeIssueEditorState, type SanitizedIssueContent };
