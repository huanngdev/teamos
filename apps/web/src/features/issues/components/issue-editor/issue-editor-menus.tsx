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
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalNode,
  type RangeSelection,
} from "lexical";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { useIssueEditorCommands, type IssueEditorBlock } from "./use-issue-editor-commands";

interface SlashCommand {
  disabled?: boolean;
  icon: ReactNode;
  id: string;
  keywords: string;
  label: string;
  run?: () => void;
}

function IssueEditorMenus({ editable }: { editable: boolean }) {
  const [editor] = useLexicalComposerContext();
  const commands = useIssueEditorCommands();
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

  editableRef.current = editable;
  menuRef.current.open = slash !== null && enabled.length > 0;
  menuRef.current.count = enabled.length;
  menuRef.current.choose = () => {
    const command = enabled[index];

    if (command?.run === undefined) {
      return;
    }

    removeSlashToken(editor);
    command.run();
  };
  menuRef.current.close = () => {
    removeSlashToken(editor);
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

        let query: string | null = null;
        let selected = false;

        editorState.read(() => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return;
          }

          const token = readSlashToken(selection);

          if (token !== null) {
            query = token.query;
            return;
          }

          selected = !selection.isCollapsed() && selection.getTextContent().length > 0;
        });

        const rect = caretRect();

        if (rect === null) {
          setSelectionBox(null);
          setSlash(null);
          return;
        }

        if (query !== null) {
          const next = { left: rect.left, query, top: rect.bottom + 4 };
          setSlash((current) =>
            sameBox(current, next) && current?.query === query ? current : next,
          );
          setSelectionBox(null);
          return;
        }

        setSlash(null);
        setSelectionBox(
          selected
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
          (event) => moveSlash(event, menuRef.current, 1, setIndex),
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          KEY_ARROW_UP_COMMAND,
          (event) => moveSlash(event, menuRef.current, -1, setIndex),
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          KEY_TAB_COMMAND,
          (event) => {
            if (event === null) {
              return false;
            }

            return moveSlash(event, menuRef.current, event.shiftKey ? -1 : 1, setIndex);
          },
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          KEY_ENTER_COMMAND,
          (event) => {
            if (event === null || !menuRef.current.open) {
              return false;
            }

            event.preventDefault();
            menuRef.current.choose();
            return true;
          },
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          KEY_ESCAPE_COMMAND,
          (event) => {
            if (event === null || !menuRef.current.open) {
              return false;
            }

            event.preventDefault();
            menuRef.current.close();
            return true;
          },
          COMMAND_PRIORITY_HIGH,
        ),
      ),
    [editor],
  );

  const active = enabled[Math.min(index, Math.max(enabled.length - 1, 0))];

  return createPortal(
    <>
      {selectionBox === null || !editable ? null : (
        <CaretMenu left={selectionBox.left} top={selectionBox.top}>
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
            <PopoverContent>
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
      {slash === null || !editable || visible.length === 0 ? null : (
        <CaretMenu
          label="Insert"
          left={slash.left}
          role="listbox"
          top={slash.top}
          wide
        >
          {visible.map((command) => {
            const selected = command.id === active?.id;

            return (
              <button
                aria-disabled={command.disabled === true}
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
                  if (command.run === undefined) {
                    return;
                  }

                  removeSlashToken(editor);
                  command.run();
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

function readSlashToken(selection: RangeSelection): { query: string } | null {
  if (!selection.isCollapsed()) {
    return null;
  }

  const node: LexicalNode = selection.anchor.getNode();

  if (!$isTextNode(node)) {
    return null;
  }

  const before = node.getTextContent().slice(0, selection.anchor.offset);
  const match = /(?:^|\s)\/([^\s/]*)$/.exec(before);
  const query = match?.[1];

  return query === undefined ? null : { query };
}

function removeSlashToken(editor: ReturnType<typeof useLexicalComposerContext>[0]): void {
  editor.update(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
      return;
    }

    const node = selection.anchor.getNode();

    if (!$isTextNode(node)) {
      return;
    }

    const offset = selection.anchor.offset;
    const before = node.getTextContent().slice(0, offset);
    const match = /(?:^|\s)(\/[^\s/]*)$/.exec(before);
    const token = match?.[1];

    if (token === undefined) {
      return;
    }

    node.spliceText(offset - token.length, token.length, "", true);
  });
}

interface MenuPositionStyle extends CSSProperties {
  "--issue-menu-left"?: string;
  "--issue-menu-top"?: string;
}

function CaretMenu({
  children,
  label,
  left,
  role,
  top,
  wide = false,
}: {
  children: ReactNode;
  label?: string;
  left: number;
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
          ? "fixed top-(--issue-menu-top) left-(--issue-menu-left) z-50 max-h-72 w-56 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          : "fixed top-(--issue-menu-top) left-(--issue-menu-left) z-50 flex items-center gap-0.5 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
      }
      onMouseDown={(event) => {
        event.preventDefault();
      }}
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
