import { describe, expect, test } from "bun:test";

import {
  issueContentDocumentSchema,
  issueContentExcerpt,
  issueContentFromPlainText,
  issueContentText,
  prepareIssueContent,
  type IssueContentDocument,
} from "./issue-content.js";

function requiredDocument(document: IssueContentDocument | null): IssueContentDocument {
  if (document === null) {
    throw new Error("Expected an issue document.");
  }

  return document;
}

describe("issue content", () => {
  test("keeps newlines and unicode as separate paragraphs", () => {
    const document = requiredDocument(issueContentFromPlainText("alpha\r\nβ\rγ"));

    expect(issueContentText(document)).toBe("alpha\nβ\nγ");
    expect(issueContentDocumentSchema.parse(document).root.children).toHaveLength(3);
  });

  test("keeps intentional blank lines and a linebreak", () => {
    const document = issueContentDocumentSchema.parse({
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "Hello",
                type: "text",
                version: 1,
              },
              { type: "linebreak", version: 1 },
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "there",
                type: "text",
                version: 1,
              },
            ],
            direction: null,
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
          {
            children: [],
            direction: null,
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "World",
                type: "text",
                version: 1,
              },
            ],
            direction: null,
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
          {
            children: [],
            direction: null,
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
        ],
        direction: null,
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
      version: 1,
    });
    const prepared = prepareIssueContent(document);

    expect(prepared.content?.root.children).toHaveLength(4);
    expect(prepared.contentText).toBe("Hello\nthere\n\nWorld\n");
  });

  test("keeps an empty list item after a filled item", () => {
    const paragraph = (value: string) => ({
      children:
        value.length === 0
          ? []
          : [
              {
                detail: 0,
                format: 0,
                mode: "normal" as const,
                style: "" as const,
                text: value,
                type: "text" as const,
                version: 1 as const,
              },
            ],
      direction: null,
      format: "" as const,
      indent: 0,
      type: "paragraph" as const,
      version: 1 as const,
    });
    const document = issueContentDocumentSchema.parse({
      root: {
        children: [
          {
            children: [
              {
                children: [paragraph("One")],
                direction: null,
                format: "",
                indent: 0,
                type: "listitem",
                value: 1,
                version: 1,
              },
              {
                children: [paragraph("")],
                direction: null,
                format: "",
                indent: 0,
                type: "listitem",
                value: 2,
                version: 1,
              },
            ],
            direction: null,
            format: "",
            indent: 0,
            listType: "bullet",
            start: 1,
            tag: "ul",
            type: "list",
            version: 1,
          },
        ],
        direction: null,
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
      version: 1,
    });
    const prepared = prepareIssueContent(document);
    const list = prepared.content?.root.children[0];

    expect(list?.type).toBe("list");

    if (list?.type !== "list") {
      return;
    }

    expect(list.children).toHaveLength(2);
    expect(prepared.contentText).toBe("One\n");
  });

  test("stores an empty description as no document", () => {
    expect(issueContentFromPlainText("")).toBeNull();
    expect(prepareIssueContent(null)).toEqual({ content: null, contentText: "" });
    expect(prepareIssueContent(issueContentFromPlainText("\n")).contentText).toBe("\n");
    const emptyParagraph = issueContentDocumentSchema.parse({
      root: {
        children: [
          {
            children: [],
            direction: null,
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
        ],
        direction: null,
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
      version: 1,
    });
    expect(prepareIssueContent(emptyParagraph).content).toBeNull();
  });

  test("rejects a javascript link and an unknown node", () => {
    const document = requiredDocument(issueContentFromPlainText("notes"));
    const withLink = {
      ...document,
      root: {
        ...document.root,
        children: [
          {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "x",
                    type: "text",
                    version: 1,
                  },
                ],
                direction: null,
                format: "",
                indent: 0,
                rel: null,
                target: null,
                title: null,
                type: "link",
                url: "javascript:alert(1)",
                version: 1,
              },
            ],
            direction: null,
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
        ],
      },
    };

    expect(issueContentDocumentSchema.safeParse(withLink).success).toBe(false);
    expect(
      issueContentDocumentSchema.safeParse({
        root: {
          children: [{ type: "image", version: 1 }],
          direction: null,
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
        version: 1,
      }).success,
    ).toBe(false);
  });

  test("accepts bold and italic and rejects underline", () => {
    const base = requiredDocument(issueContentFromPlainText("styled"));
    const text = {
      detail: 0,
      format: 3,
      mode: "normal" as const,
      style: "" as const,
      text: "styled",
      type: "text" as const,
      version: 1 as const,
    };
    const document = {
      ...base,
      root: {
        ...base.root,
        children: [
          {
            children: [text],
            direction: null,
            format: "" as const,
            indent: 0,
            type: "paragraph" as const,
            version: 1 as const,
          },
        ],
      },
    };

    expect(issueContentDocumentSchema.safeParse(document).success).toBe(true);
    expect(
      issueContentDocumentSchema.safeParse({
        ...document,
        root: {
          ...document.root,
          children: [{ ...document.root.children[0], children: [{ ...text, format: 8 }] }],
        },
      }).success,
    ).toBe(false);
  });

  test("accepts a former five-thousand-line description and unicode text", () => {
    const lines = "\n".repeat(5000);
    const lineDocument = prepareIssueContent(issueContentFromPlainText(lines));
    const unicode = "β".repeat(5000);
    const unicodeDocument = prepareIssueContent(issueContentFromPlainText(unicode));

    expect(lineDocument.content).not.toBeNull();
    expect(lineDocument.contentText).toBe(lines);
    expect(unicodeDocument.contentText).toBe(unicode);
  });

  test("rejects content past the plain-text limit", () => {
    const document = issueContentFromPlainText("a".repeat(20_001));

    expect(issueContentDocumentSchema.safeParse(document).success).toBe(false);
  });

  test("excerpts the plain text used by list rows", () => {
    expect(issueContentExcerpt("abcdef")).toBe("abcdef");
    expect(issueContentExcerpt("a".repeat(250))).toHaveLength(200);
  });
});
