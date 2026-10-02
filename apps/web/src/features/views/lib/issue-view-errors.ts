import { ApiClientError } from "@/shared/api/api-client";

function readIssueViewError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiClientError)) {
    return fallback;
  }

  switch (error.code) {
    case "CONFLICT":
      return "This view was saved somewhere else. Reload it and try again.";
    case "FORBIDDEN":
      return "You are not allowed to change this view.";
    case "ISSUE_VIEW_NOT_FOUND":
      return "This view is no longer available.";
    case "MEMBER_NOT_FOUND":
      return "A selected member cannot be used in this project.";
    case "PROJECT_NOT_FOUND":
      return "This project is no longer available.";
    case "PROJECT_STATUS_NOT_FOUND":
      return "A selected column is no longer on the board.";
    default:
      return fallback;
  }
}

function isMissingIssueView(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.status === 404 ||
      error.code === "ISSUE_VIEW_NOT_FOUND" ||
      error.code === "PROJECT_NOT_FOUND")
  );
}

export { isMissingIssueView, readIssueViewError };
