# 0003 — Agent roles: Opus coordinates, DeepSeek codes, Orca dispatches

Date: 2026-11-08 · Status: accepted (user decision)

## Context

`docs/agent-system.md` allowed one primary agent and banned role agents. The owner wants planning and quality control on a strong model and routine coding on a cheap fast model, to save tokens.

## Decision

| Role        | Who                                                                                                                                      | Does                                                                                                                                                                    | Does not                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Coordinator | Claude Code, Opus 5.5, medium effort                                                                                                     | Reads rules, writes plans/ADRs/specs, owns `AGENTS.md`, `CODE_RULES.md`, `docs/**`, dispatches workers through Orca, reviews every diff, reruns checks on gaps, commits | Bulk mechanical edits                                                                                |
| Worker      | OpenCode Go, `opencode-go/deepseek-v4.1-flash` (set in `opencode.json`), launched by `orca orchestration worker-start --agent opencode2` | Implements one self-contained spec: code, tests, migrations of config, lint fixes, running checks                                                                       | Editing docs/rules, committing, creating branches, changing scope; it `ask`s the coordinator instead |

- A worker spec names the target, the files it may edit, constraints, and the evidence (commands + exit codes) that proves completion.
- Workers share the coordinator's worktree when tasks run in sequence; parallel tasks that touch the same files get separate worktrees.
- The coordinator never trusts a "done" without evidence, and reviews the diff against `CODE_RULES.md` before committing.

## Consequences

- Specs must be precise; vague specs waste the cheap model's turns.
- `opencode.json` pins the worker model for this repo. Changing the worker model is a one-line edit there plus this ADR.
