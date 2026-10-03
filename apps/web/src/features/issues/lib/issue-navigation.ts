function hasIssueReturn(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    "issueReturn" in state &&
    state.issueReturn === true
  );
}

function issueReturnState(): { issueReturn: true } {
  return { issueReturn: true };
}

function focusIssueTrigger(issueCode: string): void {
  if (typeof document === "undefined" || issueCode.length === 0) {
    return;
  }

  document.querySelector<HTMLElement>(`[data-issue-path="${CSS.escape(issueCode)}"]`)?.focus();
}

export { focusIssueTrigger, hasIssueReturn, issueReturnState };
