import { ApiClientError } from "@/shared/api/api-client";

function readIssueError(error: unknown, fallback: string): string | null {
  if (error === null || error === undefined) {
    return null;
  }

  if (!(error instanceof ApiClientError)) {
    return fallback;
  }

  switch (error.code) {
    case "CONFLICT":
      return "Move the issues out of this column before deleting it.";
    case "FORBIDDEN":
      return "You are not allowed to do that.";
    case "ISSUE_NOT_FOUND":
      return "That issue is no longer on the board.";
    case "MEMBER_NOT_FOUND":
      return "That member cannot be assigned to this project.";
    case "PROJECT_NOT_FOUND":
      return "This project is no longer available.";
    case "PROJECT_STATUS_NAME_TAKEN":
      return "That column name is already used.";
    case "PROJECT_STATUS_NOT_FOUND":
      return "That column is no longer on the board.";
    default:
      return fallback;
  }
}

export { readIssueError };
