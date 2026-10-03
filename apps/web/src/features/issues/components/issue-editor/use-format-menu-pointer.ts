import { $getSelection, $isRangeSelection, type LexicalEditor } from "lexical";
import { useEffect, useRef } from "react";

/**
 * Keeps a selection drag alive when the pointer enters the format toolbar.
 * The toolbar sits outside the contenteditable, so the browser collapses the
 * DOM selection on the way to Bold. Click-outside and Escape still dismiss.
 */
export function useFormatMenuPointer(editor: LexicalEditor) {
  const pointerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dragging = { current: false };
    const pointerOver = { current: false };
    const restoring = { current: false };
    const savedRange = { current: null as Range | null };

    function buttonDown(event: MouseEvent) {
      return event.buttons === 1 || event.buttons === 3;
    }

    function overMenu(event: MouseEvent) {
      const menu = pointerRef.current;

      if (menu === null) {
        return false;
      }

      if (event.target instanceof Node && menu.contains(event.target)) {
        return true;
      }

      const rect = menu.getBoundingClientRect();

      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    }

    function insideEditor(event: MouseEvent) {
      const root = editor.getRootElement();

      return root !== null && event.target instanceof Node && root.contains(event.target);
    }

    function insideLinkPopover(event: MouseEvent) {
      return (
        event.target instanceof Element && event.target.closest("[data-issue-format-link]") !== null
      );
    }

    function remember() {
      const selection = window.getSelection();

      if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      const anchor = selection.anchorNode;
      const menu = pointerRef.current;

      if (anchor === null || (menu !== null && menu.contains(anchor))) {
        return;
      }

      savedRange.current = selection.getRangeAt(0).cloneRange();
    }

    function restore() {
      const saved = savedRange.current;
      const selection = window.getSelection();

      if (
        restoring.current ||
        saved === null ||
        !saved.startContainer.isConnected ||
        selection === null
      ) {
        return;
      }

      restoring.current = true;
      selection.removeAllRanges();
      selection.addRange(saved);
      restoring.current = false;
    }

    function dismiss() {
      editor.update(() => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection) || selection.isCollapsed()) {
          return;
        }

        const focus = selection.focus;
        selection.anchor.set(focus.key, focus.offset, focus.type);
      });
    }

    function onMouseDown(event: MouseEvent) {
      dragging.current = buttonDown(event);
      pointerOver.current = overMenu(event);

      if (
        event.button !== 0 ||
        pointerRef.current === null ||
        pointerOver.current ||
        insideEditor(event) ||
        insideLinkPopover(event)
      ) {
        return;
      }

      dismiss();
    }

    function onMouseMove(event: MouseEvent) {
      dragging.current = buttonDown(event);
      pointerOver.current = overMenu(event);

      if (!dragging.current || !pointerOver.current) {
        return;
      }

      const selection = window.getSelection();

      if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) {
        restore();
      }
    }

    function onMouseUp(event: MouseEvent) {
      const releaseOverMenu = overMenu(event);

      if (dragging.current && releaseOverMenu) {
        restore();
      }

      dragging.current = false;
      pointerOver.current = false;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || pointerRef.current === null) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      dismiss();
    }

    function onSelectionChange() {
      if (restoring.current) {
        return;
      }

      const selection = window.getSelection();
      const collapsed = selection === null || selection.rangeCount === 0 || selection.isCollapsed;

      if (!collapsed) {
        remember();
        return;
      }

      if (dragging.current && pointerOver.current) {
        restore();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectionchange", onSelectionChange);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [editor]);

  return { pointerRef };
}
