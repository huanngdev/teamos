import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import type { IssueContentDocument } from "@teamos/shared";
import { COMPOSITION_END_TAG } from "lexical";
import { useEffect, useRef } from "react";

import { shouldPublishEditorUpdate } from "./editor-update";
import { issueEditorExtension } from "./extensions";
import { IssueEditorMenus } from "./issue-editor-menus";
import { sanitizeIssueEditorState } from "./sanitize-document";

interface IssueEditorProps {
  document: IssueContentDocument | null;
  editable: boolean;
  generation: number;
  onChange: (content: IssueContentDocument | null, error: string | null) => void;
}

function editorJson(document: IssueContentDocument | null): string {
  if (document === null) {
    return JSON.stringify({
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
    });
  }

  return JSON.stringify({ root: document.root });
}

function publishedContentKey(content: IssueContentDocument | null, error: string | null): string {
  return error === null ? JSON.stringify(content) : error;
}

function IssueEditorSurface({ document, editable, generation, onChange }: IssueEditorProps) {
  const [editor] = useLexicalComposerContext();
  const onChangeRef = useRef(onChange);
  const documentRef = useRef(document);
  const published = useRef<string | null>(null);
  const skip = useRef(true);
  onChangeRef.current = onChange;
  documentRef.current = document;

  useEffect(() => {
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    skip.current = true;
    const state = editor.parseEditorState(editorJson(documentRef.current));
    editor.setEditorState(state);
    const sanitized = sanitizeIssueEditorState(state.toJSON());
    published.current = publishedContentKey(sanitized.content, sanitized.error);
    skip.current = false;
  }, [editor, generation]);

  useEffect(
    () =>
      editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, editorState, tags }) => {
        if (
          skip.current ||
          !shouldPublishEditorUpdate({
            composing: editor.isComposing(),
            compositionEnded: tags.has(COMPOSITION_END_TAG),
            dirtyElementCount: dirtyElements.size,
            dirtyLeafCount: dirtyLeaves.size,
          })
        ) {
          return;
        }

        const sanitized = sanitizeIssueEditorState(editorState.toJSON());
        const key = publishedContentKey(sanitized.content, sanitized.error);

        if (published.current === key) {
          return;
        }

        published.current = key;
        onChangeRef.current(sanitized.content, sanitized.error);
      }),
    [editor],
  );

  return (
    <div className="relative">
      {editable ? <IssueEditorMenus editable={editable} /> : null}
      <ContentEditable
        aria-label="Issue content"
        aria-placeholder="Add description..."
        className="min-h-6 outline-none"
        placeholder={
          <span className="pointer-events-none absolute top-0 text-muted-foreground">
            Add description...
          </span>
        }
      />
    </div>
  );
}

function IssueEditor(props: IssueEditorProps) {
  return (
    <LexicalExtensionComposer contentEditable={null} extension={issueEditorExtension}>
      <IssueEditorSurface {...props} />
    </LexicalExtensionComposer>
  );
}

export { IssueEditor };
