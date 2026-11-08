import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IssueContentDocument } from "@teamos/shared";
import { useState } from "react";
import { expect, test } from "vitest";

import { renderWithProviders } from "@/test/render-app";

import { IssueEditor } from "./issue-editor";

function paragraph(value: string) {
  return {
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
  };
}

function documentWith(lines: readonly string[]): IssueContentDocument {
  return {
    root: {
      children: lines.map((line) => paragraph(line)),
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
    version: 1,
  };
}

const notes = documentWith(["Notes"]);

function EditorProbe() {
  const [document, setDocument] = useState<IssueContentDocument | null>(notes);
  const [generation, setGeneration] = useState(1);
  const [changes, setChanges] = useState(0);

  return (
    <div>
      <IssueEditor
        document={document}
        editable={false}
        generation={generation}
        onChange={() => {
          setChanges((current) => current + 1);
        }}
      />
      <button
        onClick={() => {
          setDocument(documentWith(["Trimmed"]));
        }}
        type="button"
      >
        Replace document
      </button>
      <button
        onClick={() => {
          setDocument(documentWith(["Trimmed"]));
          setGeneration((current) => current + 1);
        }}
        type="button"
      >
        Remount editor
      </button>
      <p data-testid="changes">{changes}</p>
    </div>
  );
}

test("keeps the editor text when the document changes without a new generation", async () => {
  renderWithProviders(<EditorProbe />);

  expect(await screen.findByRole("textbox", { name: "Issue content" })).toHaveTextContent("Notes");

  await userEvent.click(screen.getByRole("button", { name: "Replace document" }));

  expect(screen.getByRole("textbox", { name: "Issue content" })).toHaveTextContent("Notes");
  expect(screen.getByTestId("changes")).toHaveTextContent("0");

  await userEvent.click(screen.getByRole("button", { name: "Remount editor" }));

  expect(screen.getByRole("textbox", { name: "Issue content" })).toHaveTextContent("Trimmed");
});
