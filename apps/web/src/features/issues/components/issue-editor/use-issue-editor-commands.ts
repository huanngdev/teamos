import { $createCodeNode, $isCodeNode } from "@lexical/code-core";
import { HistoryExtension } from "@lexical/history";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useExtensionSignalValue } from "@lexical/react/useExtensionSignalValue";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $findMatchingParent } from "@lexical/utils";
import { isSafeIssueLink } from "@teamos/shared";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { useEffect, useState } from "react";

type IssueEditorBlock = "paragraph" | "h1" | "h2" | "h3" | "quote" | "code";

interface IssueEditorCommands {
  block: IssueEditorBlock;
  bold: boolean;
  canRedo: boolean;
  canUndo: boolean;
  code: boolean;
  italic: boolean;
  linkError: string | null;
  linkOpen: boolean;
  linkUrl: string;
  redo: () => void;
  setBlock: (block: IssueEditorBlock) => void;
  setLinkOpen: (open: boolean) => void;
  setLinkUrl: (value: string) => void;
  toggleBold: () => void;
  toggleBulletList: () => void;
  toggleCheckList: () => void;
  toggleCode: () => void;
  toggleItalic: () => void;
  toggleLink: () => void;
  toggleNumberList: () => void;
  undo: () => void;
}

function useIssueEditorCommands(): IssueEditorCommands {
  const [editor] = useLexicalComposerContext();
  const canUndo = useExtensionSignalValue(HistoryExtension, "canUndo");
  const canRedo = useExtensionSignalValue(HistoryExtension, "canRedo");
  const [block, setBlockState] = useState<IssueEditorBlock>("paragraph");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [code, setCode] = useState(false);
  const [linkOpen, setLinkOpenState] = useState(false);
  const [linkUrl, setLinkUrlState] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return;
          }

          const anchor = selection.anchor.getNode();
          const element = anchor.getTopLevelElement() ?? anchor;
          let nextBlock: IssueEditorBlock = "paragraph";

          if ($isHeadingNode(element)) {
            const tag = element.getTag();
            nextBlock = tag === "h1" || tag === "h2" || tag === "h3" ? tag : "paragraph";
          } else if ($isQuoteNode(element)) {
            nextBlock = "quote";
          } else if ($isCodeNode(element)) {
            nextBlock = "code";
          }

          setBlockState(nextBlock);
          setBold(selection.hasFormat("bold"));
          setItalic(selection.hasFormat("italic"));
          setCode(selection.hasFormat("code"));
        });
      }),
    [editor],
  );

  function setBlock(next: IssueEditorBlock) {
    editor.update(() => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return;
      }

      $setBlocksType(selection, () => {
        if (next === "h1" || next === "h2" || next === "h3") {
          return $createHeadingNode(next);
        }

        if (next === "quote") {
          return $createQuoteNode();
        }

        if (next === "code") {
          return $createCodeNode();
        }

        return $createParagraphNode();
      });
    });
  }

  function setLinkOpen(open: boolean) {
    if (open) {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        const node = $isRangeSelection(selection) ? selection.anchor.getNode() : null;
        const link = node === null ? null : $findMatchingParent(node, $isLinkNode);

        setLinkUrlState(link !== null && $isLinkNode(link) ? link.getURL() : "");
      });
      setLinkError(null);
    }

    setLinkOpenState(open);
  }

  function toggleLink() {
    if (!isSafeIssueLink(linkUrl)) {
      setLinkError("Use an http, https, or mailto link.");
      return;
    }

    editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url: linkUrl.trim() });
    setLinkError(null);
    setLinkOpenState(false);
  }

  return {
    block,
    bold,
    canRedo,
    canUndo,
    code,
    italic,
    linkError,
    linkOpen,
    linkUrl,
    redo: () => {
      editor.dispatchCommand(REDO_COMMAND, undefined);
    },
    setBlock,
    setLinkOpen,
    setLinkUrl: (value) => {
      setLinkUrlState(value);
      setLinkError(null);
    },
    toggleBold: () => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
    },
    toggleBulletList: () => {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    },
    toggleCheckList: () => {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    },
    toggleCode: () => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
    },
    toggleItalic: () => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
    },
    toggleLink,
    toggleNumberList: () => {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    },
    undo: () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    },
  };
}

export { useIssueEditorCommands, type IssueEditorBlock };
