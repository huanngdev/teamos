import {
  CodeExtension,
  CodeHighlightNode,
  CodeIndentExtension,
  $createCodeNode,
} from "@lexical/code-core";
import { configExtension, KeyboardShortcutsExtension } from "@lexical/extension";
import { HistoryExtension } from "@lexical/history";
import { $isLinkNode, LinkExtension, LinkNode } from "@lexical/link";
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  CheckListExtension,
  ListExtension,
} from "@lexical/list";
import {
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  CODE,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  ORDERED_LIST,
  QUOTE,
  registerMarkdownShortcuts,
  UNORDERED_LIST,
} from "@lexical/markdown";
import { $createHeadingNode, $createQuoteNode, RichTextExtension } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import { isSafeIssueLink } from "@teamos/shared";
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  CONTROL_OR_META,
  createCommand,
  defineExtension,
  type ElementNode,
  TextNode,
  type LexicalCommand,
} from "lexical";

import { issueEditorTheme } from "./theme";

const ISSUE_HEADING_1 = createCommand<KeyboardEvent>("ISSUE_HEADING_1");
const ISSUE_HEADING_2 = createCommand<KeyboardEvent>("ISSUE_HEADING_2");
const ISSUE_HEADING_3 = createCommand<KeyboardEvent>("ISSUE_HEADING_3");
const ISSUE_QUOTE = createCommand<KeyboardEvent>("ISSUE_QUOTE");
const ISSUE_CODE_BLOCK = createCommand<KeyboardEvent>("ISSUE_CODE_BLOCK");
const ISSUE_INLINE_CODE = createCommand<KeyboardEvent>("ISSUE_INLINE_CODE");
const ISSUE_BULLET_LIST = createCommand<KeyboardEvent>("ISSUE_BULLET_LIST");
const ISSUE_NUMBER_LIST = createCommand<KeyboardEvent>("ISSUE_NUMBER_LIST");
const ISSUE_CHECK_LIST = createCommand<KeyboardEvent>("ISSUE_CHECK_LIST");
const textFormatMask = 19;

const issueMarkdown = [
  HEADING,
  QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  CHECK_LIST,
  CODE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  INLINE_CODE,
];

function applyBlock(
  command: LexicalCommand<KeyboardEvent>,
  create: () => ElementNode,
): [LexicalCommand<KeyboardEvent>, (event: KeyboardEvent) => boolean] {
  return [
    command,
    (event) => {
      event.preventDefault();
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, create);
      }

      return true;
    },
  ];
}

const IssueSanitizeExtension = defineExtension({
  name: "teamos-issue-sanitize",
  register: (editor) =>
    mergeRegister(
      editor.registerNodeTransform(TextNode, (node) => {
        const format = node.getFormat();
        const allowed = format & textFormatMask;

        if (format !== allowed) {
          node.setFormat(allowed);
        }

        if (node.getStyle() !== "") {
          node.setStyle("");
        }
      }),
      editor.registerNodeTransform(CodeHighlightNode, (node) => {
        const text = $createTextNode(node.getTextContent());
        text.setFormat(node.getFormat() & textFormatMask);
        node.replace(text);
      }),
      editor.registerNodeTransform(LinkNode, (node) => {
        if (isSafeIssueLink(node.getURL())) {
          return;
        }

        const children = node.getChildren();

        for (const child of children) {
          node.insertBefore(child);
        }

        node.remove();
      }),
      registerMarkdownShortcuts(editor, issueMarkdown),
      ...[
        applyBlock(ISSUE_HEADING_1, () => $createHeadingNode("h1")),
        applyBlock(ISSUE_HEADING_2, () => $createHeadingNode("h2")),
        applyBlock(ISSUE_HEADING_3, () => $createHeadingNode("h3")),
        applyBlock(ISSUE_QUOTE, () => $createQuoteNode()),
        applyBlock(ISSUE_CODE_BLOCK, () => $createCodeNode()),
      ].map(([command, handler]) =>
        editor.registerCommand(command, handler, COMMAND_PRIORITY_EDITOR),
      ),
      editor.registerCommand(
        ISSUE_INLINE_CODE,
        (event) => {
          event.preventDefault();
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            selection.formatText("code");
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        ISSUE_BULLET_LIST,
        (event) => {
          event.preventDefault();
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        ISSUE_NUMBER_LIST,
        (event) => {
          event.preventDefault();
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        ISSUE_CHECK_LIST,
        (event) => {
          event.preventDefault();
          editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    ),
});

const withModifiers = { ...CONTROL_OR_META, altKey: true as const };
const withShift = { ...CONTROL_OR_META, shiftKey: true as const };

const issueEditorExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    ListExtension,
    CheckListExtension,
    CodeExtension,
    CodeIndentExtension,
    configExtension(LinkExtension, {
      attributes: { rel: null, target: null, title: null },
      validateUrl: isSafeIssueLink,
    }),
    configExtension(KeyboardShortcutsExtension, {
      priority: COMMAND_PRIORITY_HIGH,
      shortcuts: {
        issueCodeBlock: { command: ISSUE_CODE_BLOCK, key: "c", modifiers: withModifiers },
        issueHeading1: { command: ISSUE_HEADING_1, key: "1", modifiers: withModifiers },
        issueHeading2: { command: ISSUE_HEADING_2, key: "2", modifiers: withModifiers },
        issueHeading3: { command: ISSUE_HEADING_3, key: "3", modifiers: withModifiers },
        issueInlineCode: { command: ISSUE_INLINE_CODE, key: "e", modifiers: withModifiers },
        issueQuote: {
          command: ISSUE_QUOTE,
          key: "q",
          modifiers: { ctrlKey: true, shiftKey: true },
        },
        issueBullet: { command: ISSUE_BULLET_LIST, key: "8", modifiers: withShift },
        issueNumber: { command: ISSUE_NUMBER_LIST, key: "7", modifiers: withShift },
        issueCheck: { command: ISSUE_CHECK_LIST, key: "9", modifiers: withShift },
      },
    }),
    IssueSanitizeExtension,
  ],
  name: "teamos-issue-editor",
  namespace: "teamos-issue",
  theme: issueEditorTheme,
});

export { $isLinkNode, issueEditorExtension };
