# TeamOS Code Rules

Every agent or contributor must read this file before writing or modifying code in this repository.

## 1. Preserve Type Safety

- Use TypeScript in strict mode across all apps and packages.
- Do not use `any`, unsafe type assertions, `@ts-ignore`, or non-null assertions to bypass the type system. If an exception is genuinely necessary, keep it narrow and explain why in a comment.
- Treat API input, environment variables, database results from untrusted sources, file contents, and real-time messages as unknown until they are validated.
- Define shared runtime schemas and derive types from them when practical. Do not maintain duplicate types that can drift apart.
- Use discriminated unions, exhaustive checks, and typed error results for meaningful application states.
- Keep frontend and backend request, response, and event contracts in `packages/shared`.
- A change is not complete while it introduces TypeScript errors.

## 2. Choose the Best Practical Performance Approach

- Consider algorithmic cost, database access, network round trips, payload size, rendering work, memory use, and expected scale before implementation.
- Prefer the simplest approach that meets measured or reasonably expected performance requirements.
- Avoid premature micro-optimization. Optimize important paths using evidence, profiling, query plans, or benchmarks when available.
- Prevent N+1 database queries, unbounded reads, unnecessary polling, duplicate requests, and avoidable React re-renders.
- Paginate potentially large collections and select only the database fields needed by the caller.
- Add indexes for demonstrated query patterns and verify important queries rather than guessing.
- Cache only when there is a clear benefit and a defined invalidation strategy. PostgreSQL remains the durable source of truth.
- Keep real-time events small and scoped to the relevant organization, project, channel, or user.
- Preserve correctness, security, and maintainability when optimizing.

## 3. Build Reusable Functions

- Extract a shared function when behavior is repeated, likely to be reused, or represents one domain rule that must stay consistent.
- Put cross-app, environment-agnostic functions in `packages/shared/utilities`, grouped by domain or responsibility.
- Keep browser-only logic in `apps/web` and server-only, database, authentication, or secret-dependent logic out of `packages/shared`.
- Prefer small pure functions with explicit inputs and outputs.
- Avoid speculative abstractions, generic helper dumping grounds, and wrappers that only rename an existing API.
- Reuse established functions and components before adding another implementation.
- Give utilities focused tests, especially for edge cases and domain rules.

## 4. Keep Code Clear and Maintainable

- Use descriptive names and keep modules focused on one responsibility.
- Prefer straightforward control flow over clever or compressed code.
- Make dependencies explicit and avoid hidden mutable global state.
- Comment decisions, constraints, or surprising behavior—not syntax that is already obvious.
- Remove dead code created by the change, but do not rewrite unrelated code.

## 5. Separate Frontend Logic from UI

- Always split frontend features into hooks and components. This is a required architecture rule, not an optional refactor.
- Components are presentational: they receive typed props and render UI.
- Put state management, data fetching, mutations, subscriptions, effects, permissions, validation, derived domain state, and non-trivial event-handler logic in dedicated hooks.
- A UI component must not contain business logic or define functions that implement feature behavior.
- Hooks should expose a small, typed interface containing the state and callbacks the component needs.
- Keep reusable feature hooks close to their feature. Move genuinely cross-feature hooks to an appropriately named shared frontend location.
- Keep pure cross-app utilities in `packages/shared/utilities`; do not disguise general utility functions as React hooks.
- Tiny render-only expressions such as mapping props to JSX, selecting a CSS class, or directly forwarding a callback are allowed when extracting them would reduce clarity.
- Avoid oversized hooks. Split orchestration, server-state access, and reusable domain behavior when they have distinct responsibilities.
- Test behavior through hooks or their underlying pure functions, and test components primarily for rendering and user interaction wiring.

## 6. Validate Before Completion

- Run the available formatter, linter, type checker, relevant tests, and production build.
- Test authorization and organization isolation for protected features.
- Test shared contracts from both frontend and backend usage when they change.
- For performance-sensitive work, record how the chosen approach was evaluated.
- If a required check cannot run, report exactly which check was skipped and why.
