# Third-party source

## Issue editor

The issue content editor is adapted from [shadcn-editor](https://github.com/htmujahid/shadcn-editor) at commit `a376368f93ca8085edf5752064c15b4691a31019`.

Copyright (c) 2026 Talha Mujahid

The upstream project is MIT licensed. TeamOS vendors only the editor behavior it uses: paragraph, heading, bold, italic, lists, checklist, quote, link, code block, and undo/redo. The modules live in `apps/web/src/features/issues/components/issue-editor/`. The notice in that folder records the same source. The upstream playground, Shiki highlighter, generated primitives, and agent config are not included.

The stored document is validated in `packages/shared` without importing the editor runtime.
