import { expect, test } from "vitest";

import { shouldPublishEditorUpdate } from "./editor-update";

test("does not write content for a selection-only update", () => {
  expect(
    shouldPublishEditorUpdate({
      composing: false,
      compositionEnded: false,
      dirtyElementCount: 0,
      dirtyLeafCount: 0,
    }),
  ).toBe(false);
});

test("writes a document change", () => {
  expect(
    shouldPublishEditorUpdate({
      composing: false,
      compositionEnded: false,
      dirtyElementCount: 1,
      dirtyLeafCount: 1,
    }),
  ).toBe(true);
});

test("holds a composition until it ends", () => {
  expect(
    shouldPublishEditorUpdate({
      composing: true,
      compositionEnded: false,
      dirtyElementCount: 1,
      dirtyLeafCount: 1,
    }),
  ).toBe(false);
  expect(
    shouldPublishEditorUpdate({
      composing: true,
      compositionEnded: true,
      dirtyElementCount: 1,
      dirtyLeafCount: 1,
    }),
  ).toBe(true);
});
