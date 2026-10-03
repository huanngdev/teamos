interface EditorUpdatePublishInput {
  composing: boolean;
  compositionEnded: boolean;
  dirtyElementCount: number;
  dirtyLeafCount: number;
}

function shouldPublishEditorUpdate(update: EditorUpdatePublishInput): boolean {
  if (update.dirtyElementCount === 0 && update.dirtyLeafCount === 0) {
    return false;
  }

  return !update.composing || update.compositionEnded;
}

export { shouldPublishEditorUpdate, type EditorUpdatePublishInput };
