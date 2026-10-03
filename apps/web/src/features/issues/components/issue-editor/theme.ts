import type { EditorThemeClasses } from "lexical";

import "./issue-editor.css";

const issueEditorTheme: EditorThemeClasses = {
  code: "relative mb-3 block overflow-x-auto rounded-lg border bg-muted/40 py-3 pe-4 ps-4 font-mono text-sm leading-relaxed [tab-size:2] [white-space:pre]",
  heading: {
    h1: "mt-4 mb-2 text-2xl font-semibold tracking-tight first:mt-0",
    h2: "mt-4 mb-2 text-xl font-semibold tracking-tight first:mt-0",
    h3: "mt-3 mb-2 text-lg font-semibold tracking-tight first:mt-0",
  },
  indent: "editor-indent",
  link: "text-primary underline underline-offset-2",
  list: {
    checklist: "ps-1",
    listitem: "relative",
    listitemChecked: "text-muted-foreground line-through",
    listitemUnchecked: "",
    ol: "m-0 mb-2 list-decimal ps-6",
    ul: "m-0 mb-2 list-disc ps-6",
  },
  paragraph: "mb-2 last:mb-0",
  quote: "my-3 border-s-2 ps-4 text-muted-foreground italic",
  root: "outline-none",
  text: {
    bold: "font-bold",
    code: "rounded bg-muted px-1 font-mono text-sm",
    italic: "italic",
  },
};

export { issueEditorTheme };
