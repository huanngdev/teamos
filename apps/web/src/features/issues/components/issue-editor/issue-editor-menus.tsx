import {
  CodeIcon,
  ImageIcon,
  LinkIcon,
  ListBulletsIcon,
  ListChecksIcon,
  ListNumbersIcon,
  PaperclipIcon,
  QuotesIcon,
  TableIcon,
  TextAaIcon,
  TextBIcon,
  TextHIcon,
  TextItalicIcon,
} from "@phosphor-icons/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
  type TextNode,
} from "lexical";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { useFormatMenuPointer } from "./use-format-menu-pointer";
import { useIssueEditorCommands, type IssueEditorBlock } from "./use-issue-editor-commands";

interface SlashCommand {
  disabled?: boolean;
  icon: ReactNode;
  id: string;
  keywords: string;
  label: string;
  run?: () => void;
}

interface SlashMatch {
  nodeKey: string;
  query: string;
  slashOffset: number;
  token: string;
}

function IssueEditorMenus({ editable }: { editable: boolean }) {
  const [editor] = useLexicalComposerContext();
  const commands = useIssueEditorCommands();
  const formatPointer = useFormatMenuPointer(editor);
  const [selectionBox, setSelectionBox] = useState<{ left: number; top: number } | null>(null);
  const [slash, setSlash] = useState<{ left: number; query: string; top: number } | null>(null);
  const [index, setIndex] = useState(0);
  const editableRef = useRef(editable);
  const slashCommands = slashCommandList(commands);
  const visible =
    slash === null ? [] : slashCommands.filter((command) => matchesSlash(command, slash.query));
  const enabled = visible.filter((command) => command.disabled !== true);
  const menuRef = useRef({
    choose: () => undefined as void,
    close: () => undefined as void,
    count: 0,
    open: false,
  });
  const dismissedRef = useRef<string | null>(null);
  const tokenRef = useRef<SlashMatch | null>(null);
  const touchHandled = useRef<string | null>(null);

  editableRef.current = editable;
  menuRef.current.open = slash !== null;
  menuRef.current.count = enabled.length;
  menuRef.current.choose = () => {
    const command = enabled[index];
    const token = tokenRef.current;

    if (command?.run === undefined || command.disabled === true || token === null) {
      return;
    }

    commitSlash(editor, token, command.run);
  };
  menuRef.current.close = () => {
    dismissedRef.current = tokenRef.current === null ? null : slashIdentity(tokenRef.current);
    setSlash(null);
  };

  useEffect(() => {
    setIndex(0);
  }, [slash?.query]);

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        if (!editableRef.current) {
          setSelectionBox(null);
          setSlash(null);
          return;
        }

        const reading = editorState.read((): { selected: boolean; token: SlashMatch | null } => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return { selected: false, token: null };
          }

          const nextToken = readSlashToken(selection);

          return {
            selected:
              nextToken === null &&
              !selection.isCollapsed() &&
              selection.getTextContent().length > 0,
            token: nextToken,
          };
        });
        const activeToken = reading.token;

        if (activeToken !== null) {
          const id = slashIdentity(activeToken);

          if (dismissedRef.current !== null && dismissedRef.current !== id) {
            dismissedRef.current = null;
          }

          tokenRef.current = activeToken;

          if (dismissedRef.current === id || editor.isComposing()) {
            setSlash(null);
            setSelectionBox(null);
            return;
          }

          const position = slashPosition(editor, activeToken.nodeKey);
          const next = { left: position.left, query: activeToken.query, top: position.top };
          setSlash((current) =>
            sameBox(current, next) && current?.query === activeToken.query ? current : next,
          );
          setSelectionBox(null);
          return;
        }

        dismissedRef.current = null;
        tokenRef.current = null;
        setSlash(null);

        const rect = caretRect();

        if (rect === null) {
          setSelectionBox(null);
          return;
        }

        setSelectionBox(
          reading.selected
            ? { left: rect.left, top: rect.top < 48 ? rect.bottom + 4 : rect.top - 44 }
            : null,
        );
      }),
    [editor],
  );

  useEffect(
    () =>
      mergeRegister(
        editor.registerCommand(
          KEY_ARROW_DOWN_COMMAND,
          (event) =>
            guardSlashKey(event, editor, menuRef.current, (keyEvent) =>
              moveSlash(keyEvent, menuRef.current, 1, setIndex),
            ),
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          KEY_ARROW_UP_COMMAND,
          (event) =>
            guardSlashKey(event, editor, menuRef.current, (keyEvent) =>
              moveSlash(keyEvent, menuRef.current, -1, setIndex),
            ),
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          KEY_TAB_COMMAND,
          (event) =>
            guardSlashKey(event, editor, menuRef.current, (keyEvent) =>
              moveSlash(keyEvent, menuRef.current, keyEvent.shiftKey ? -1 : 1, setIndex),
            ),
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          KEY_ENTER_COMMAND,
          (event) =>
            guardSlashKey(event, editor, menuRef.current, (keyEvent) => {
              keyEvent.preventDefault();

              if (menuRef.current.count > 0) {
                menuRef.current.choose();
              }

              return true;
            }),
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          KEY_ESCAPE_COMMAND,
          (event) =>
            guardSlashKey(event, editor, menuRef.current, (keyEvent) => {
              keyEvent.preventDefault();
              menuRef.current.close();
              return true;
            }),
          COMMAND_PRIORITY_HIGH,
        ),
      ),
    [editor],
  );

  const active = enabled[Math.min(index, Math.max(enabled.length - 1, 0))];

  return createPortal(
    <>
      {selectionBox === null || !editable ? null : (
        <CaretMenu
          left={selectionBox.left}
          pointerRef={formatPointer.pointerRef}
          top={selectionBox.top}
        >
          <Toggle aria-label="Bold" onPressedChange={commands.toggleBold} pressed={commands.bold}>
            <TextBIcon />
          </Toggle>
          <Toggle
            aria-label="Italic"
            onPressedChange={commands.toggleItalic}
            pressed={commands.italic}
          >
            <TextItalicIcon />
          </Toggle>
          <Toggle
            aria-label="Inline code"
            onPressedChange={commands.toggleCode}
            pressed={commands.code}
          >
            <CodeIcon />
          </Toggle>
          <Popover onOpenChange={commands.setLinkOpen} open={commands.linkOpen}>
            <PopoverTrigger
              render={
                <Button aria-label="Link" size="icon" type="button" variant="ghost">
                  <LinkIcon />
                </Button>
              }
            />
            <PopoverContent data-issue-format-link="">
              <form
                className="flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  commands.toggleLink();
                }}
              >
                <Input
                  aria-label="Link address"
                  onChange={(event) => {
                    commands.setLinkUrl(event.target.value);
                  }}
                  placeholder="https://"
                  value={commands.linkUrl}
                />
                {commands.linkError === null ? null : (
                  <p className="text-xs text-destructive">{commands.linkError}</p>
                )}
                <Button type="submit">
                  <LinkIcon data-icon="inline-start" />
                  Apply link
                </Button>
              </form>
            </PopoverContent>
          </Popover>
        </CaretMenu>
      )}
      {slash === null || !editable ? null : (
        <CaretMenu label="Insert" left={slash.left} role="listbox" top={slash.top} wide>
          {visible.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No results</p>
          ) : null}
          {visible.map((command) => {
            const selected = command.id === active?.id;

            return (
              <button
                aria-disabled={command.disabled === true}
                aria-label={
                  command.disabled === true ? `${command.label} Unavailable` : command.label
                }
                aria-selected={selected}
                className={
                  selected
                    ? "flex w-full items-center gap-2 rounded-md bg-accent px-2 py-1.5 text-left text-sm text-foreground"
                    : "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground disabled:opacity-50"
                }
                disabled={command.disabled === true}
                id={`issue-slash-${command.id}`}
                key={command.id}
                onClick={() => {
                  if (touchHandled.current === command.id) {
                    touchHandled.current = null;
                    return;
                  }

                  touchHandled.current = null;
                  activateSlash(command, editor, tokenRef.current);
                }}
                onPointerUp={(event) => {
                  if (event.pointerType !== "touch") {
                    return;
                  }

                  touchHandled.current = command.id;
                  activateSlash(command, editor, tokenRef.current);
                }}
                role="option"
                type="button"
              >
                {command.icon}
                <span className="min-w-0 flex-1 truncate">{command.label}</span>
                {command.disabled === true ? (
                  <span className="text-xs text-muted-foreground">Unavailable</span>
                ) : null}
              </button>
            );
          })}
        </CaretMenu>
      )}
    </>,
    document.body,
  );
}

function slashCommandList(commands: ReturnType<typeof useIssueEditorCommands>): SlashCommand[] {
  const block = (
    id: string,
    label: string,
    keywords: string,
    icon: ReactNode,
    next: IssueEditorBlock,
  ) => ({
    icon,
    id,
    keywords,
    label,
    run: () => {
      commands.setBlock(next);
    },
  });

  return [
    block("paragraph", "Text", "paragraph", <TextAaIcon />, "paragraph"),
    block("h1", "Heading 1", "h1 heading", <TextHIcon />, "h1"),
    block("h2", "Heading 2", "h2 heading", <TextHIcon />, "h2"),
    block("h3", "Heading 3", "h3 heading", <TextHIcon />, "h3"),
    {
      icon: <ListBulletsIcon />,
      id: "bullet",
      keywords: "bulleted list ul",
      label: "Bulleted list",
      run: commands.toggleBulletList,
    },
    {
      icon: <ListNumbersIcon />,
      id: "number",
      keywords: "numbered list ol",
      label: "Numbered list",
      run: commands.toggleNumberList,
    },
    {
      icon: <ListChecksIcon />,
      id: "check",
      keywords: "checklist todo",
      label: "Checklist",
      run: commands.toggleCheckList,
    },
    block("quote", "Quote", "blockquote", <QuotesIcon />, "quote"),
    block("code", "Code block", "code", <CodeIcon />, "code"),
    {
      disabled: true,
      icon: <TableIcon />,
      id: "table",
      keywords: "table grid",
      label: "Table",
    },
    {
      disabled: true,
      icon: <ImageIcon />,
      id: "image",
      keywords: "image photo",
      label: "Image",
    },
    {
      disabled: true,
      icon: <PaperclipIcon />,
      id: "file",
      keywords: "file attachment upload",
      label: "File",
    },
  ];
}

function matchesSlash(command: SlashCommand, query: string): boolean {
  if (query.length === 0) {
    return true;
  }

  return `${command.label} ${command.keywords}`.toLowerCase().includes(query.toLowerCase());
}

function slashIdentity(token: SlashMatch): string {
  return `${token.nodeKey}:${token.slashOffset}`;
}

function matchSlash(before: string): { query: string; token: string } | null {
  const match = /(?:^|\s)(\/([^\s/]*))$/.exec(before);
  const token = match?.[1];
  const query = match?.[2];

  if (token === undefined || query === undefined) {
    return null;
  }

  return { query, token };
}

// Firefox can leave the caret on the parent element at a child boundary.
// Resolve that to the text point Lexical would normalize to, without writing
// the selection during a read.
function slashTextPoint(selection: RangeSelection): { node: TextNode; offset: number } | null {
  let node: LexicalNode = selection.anchor.getNode();
  let offset = selection.anchor.offset;
  let type = selection.anchor.type;

  while (type === "element") {
    if (!$isElementNode(node)) {
      return null;
    }

    const atEnd = offset === node.getChildrenSize();
    const child = node.getChildAtIndex(atEnd ? offset - 1 : offset);

    if ($isTextNode(child)) {
      node = child;
      offset = atEnd ? child.getTextContentSize() : 0;
      type = "text";
      break;
    }

    if (!$isElementNode(child)) {
      return null;
    }

    node = child;
    offset = atEnd ? child.getChildrenSize() : 0;
  }

  if (!$isTextNode(node) || !node.isSimpleText()) {
    return null;
  }

  return { node, offset };
}

function readSlashToken(selection: RangeSelection): SlashMatch | null {
  if (!selection.isCollapsed()) {
    return null;
  }

  const point = slashTextPoint(selection);

  if (point === null) {
    return null;
  }

  const match = matchSlash(point.node.getTextContent().slice(0, point.offset));

  if (match === null) {
    return null;
  }

  return {
    nodeKey: point.node.getKey(),
    query: match.query,
    slashOffset: point.offset - match.token.length,
    token: match.token,
  };
}

function commitSlash(editor: LexicalEditor, token: SlashMatch, run: () => void): void {
  // A click handler is not already inside an update, so a plain editor.update
  // waits for a microtask before it commits. discrete applies the caret, the
  // command, and the token removal before the handler returns. Inside a key
  // command the same calls are queued and still run in this order.
  editor.update(
    () => {
      const node = $getNodeByKey(token.nodeKey);

      if (!$isTextNode(node)) {
        return;
      }

      node.select(token.slashOffset + token.token.length, token.slashOffset + token.token.length);
    },
    { discrete: true },
  );

  try {
    run();
  } catch {
    return;
  }

  editor.update(
    () => {
      const node = $getNodeByKey(token.nodeKey);

      if (!$isTextNode(node)) {
        return;
      }

      const slice = node
        .getTextContent()
        .slice(token.slashOffset, token.slashOffset + token.token.length);

      if (slice !== token.token) {
        return;
      }

      node.spliceText(token.slashOffset, token.token.length, "", true);
    },
    { discrete: true },
  );
}

// An open menu owns Enter, Escape, and movement keys. An IME confirmation
// still has to reach the browser, so claim the command without preventDefault.
function guardSlashKey(
  event: KeyboardEvent | null,
  editor: LexicalEditor,
  menu: { open: boolean },
  run: (event: KeyboardEvent) => boolean,
): boolean {
  if (event === null || !menu.open) {
    return false;
  }

  if (isImeKey(event, editor)) {
    return true;
  }

  return run(event);
}

function activateSlash(
  command: SlashCommand,
  editor: LexicalEditor,
  token: SlashMatch | null,
): void {
  if (command.disabled === true || command.run === undefined || token === null) {
    return;
  }

  commitSlash(editor, token, command.run);
}

// A collapsed caret often has an empty client rect. The menu still opens,
// anchored to the block when the caret itself has no box.
function slashPosition(editor: LexicalEditor, nodeKey: string): { left: number; top: number } {
  const caret = caretRect();

  if (caret !== null) {
    return { left: caret.left, top: caret.bottom + 4 };
  }

  const element = editor.getElementByKey(nodeKey) ?? editor.getRootElement();

  if (element === null) {
    return { left: 0, top: 0 };
  }

  const box = element.getBoundingClientRect();
  return { left: box.left, top: box.bottom + 4 };
}

function isImeKey(event: KeyboardEvent, editor: LexicalEditor): boolean {
  return event.isComposing || event.keyCode === 229 || editor.isComposing();
}

// Phosphor icons omit width and height unless a size is passed. A bare SVG
// then uses the browser default of 300×150, which is the unstyled slash row.
const caretMenuClass =
  "fixed top-(--issue-menu-top) left-(--issue-menu-left) z-50 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

interface MenuPositionStyle extends CSSProperties {
  "--issue-menu-left"?: string;
  "--issue-menu-top"?: string;
}

function CaretMenu({
  children,
  label,
  left,
  pointerRef,
  role,
  top,
  wide = false,
}: {
  children: ReactNode;
  label?: string;
  left: number;
  pointerRef?: Ref<HTMLDivElement>;
  role?: "listbox";
  top: number;
  wide?: boolean;
}) {
  const style: MenuPositionStyle = {
    "--issue-menu-left": `${left}px`,
    "--issue-menu-top": `${top}px`,
  };

  return (
    <div
      aria-label={label}
      className={
        wide
          ? `${caretMenuClass} max-h-72 w-56 overflow-x-hidden overflow-y-auto`
          : `${caretMenuClass} flex items-center gap-0.5`
      }
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      ref={pointerRef}
      role={role}
      style={style}
    >
      {children}
    </div>
  );
}

function caretRect(): DOMRect | null {
  const selection = window.getSelection();

  if (selection === null || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (typeof range.getBoundingClientRect !== "function") {
    return null;
  }

  const rect = range.getBoundingClientRect();

  if (rect.height === 0 && rect.width === 0) {
    return null;
  }

  return rect;
}

function sameBox(
  current: { left: number; top: number } | null,
  next: { left: number; top: number },
): boolean {
  return current !== null && current.left === next.left && current.top === next.top;
}

function moveSlash(
  event: KeyboardEvent,
  menu: { count: number; open: boolean },
  direction: number,
  setIndex: (update: (current: number) => number) => void,
): boolean {
  if (!menu.open || menu.count === 0) {
    return false;
  }

  event.preventDefault();
  setIndex((current) => (current + direction + menu.count) % menu.count);
  return true;
}

export { IssueEditorMenus };
