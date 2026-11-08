import type { Database } from "../../client.js";

/*
 * Repositories accept either the database or an open transaction. The caller
 * owns the transaction boundary; a repository never opens one itself.
 */
type IssueReader = Pick<Database, "select">;
type IssueExecutor = Pick<Database, "delete" | "execute" | "insert" | "select" | "update">;

interface StoredAssignee {
  email: string;
  id: string;
  image: string | null;
  name: string;
}

interface IssueRecord {
  assignees: StoredAssignee[];
  content?: unknown;
  contentText?: string;
  createdAt: Date;
  id: string;
  number: bigint;
  position: number;
  priority: string;
  statusId: string;
  title: string;
  updatedAt: Date;
}

export type { IssueExecutor, IssueReader, IssueRecord, StoredAssignee };
