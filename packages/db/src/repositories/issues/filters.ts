import {
  getIssuePriorityLabel,
  getIssueStatusCategoryLabel,
  issueNumberSearchDecimal,
  issuePriorities,
  issueStatusCategories,
  needleMatchesIssueCodeText,
  type IssueListFilters,
} from "@teamos/shared";
import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { issue, issueAssignee, member, projectStatus, user } from "../../schema/index.js";
import { buildLiteralSearchCondition } from "../search.js";

function issueStatusJoin(): SQL | undefined {
  return and(
    eq(issue.statusId, projectStatus.id),
    eq(issue.projectId, projectStatus.projectId),
    eq(issue.organizationId, projectStatus.organizationId),
  );
}

function dateBounds(
  column: PgColumn,
  timeZone: string,
  from: string | undefined,
  to: string | undefined,
): SQL | undefined {
  const bounds: SQL[] = [];

  if (from !== undefined) {
    bounds.push(sql`(${column} at time zone ${timeZone})::date >= ${from}::date`);
  }

  if (to !== undefined) {
    bounds.push(sql`(${column} at time zone ${timeZone})::date <= ${to}::date`);
  }

  if (bounds.length === 0) {
    return undefined;
  }

  return bounds.length === 1 ? bounds[0] : and(...bounds);
}

function buildIssueSearch(needle: string | undefined): SQL | undefined {
  if (needle === undefined) {
    return undefined;
  }

  const lowered = needle.toLowerCase();
  const matches: SQL[] = [
    sql`position(${lowered} in lower(${issue.title})) > 0`,
    sql`position(${lowered} in lower(${issue.contentText})) > 0`,
    sql`position(${lowered} in ('#' || ${issue.number}::text)) > 0`,
    sql`position(${lowered} in lower(${projectStatus.name})) > 0`,
    sql`position(${lowered} in lower(${projectStatus.category})) > 0`,
    sql`position(${lowered} in lower(${issue.priority})) > 0`,
    sql`exists (
      select 1
      from ${issueAssignee}
      inner join ${member} on ${member.id} = ${issueAssignee.memberId}
        and ${member.organizationId} = ${issueAssignee.organizationId}
      inner join ${user} on ${user.id} = ${member.userId}
      where ${issueAssignee.issueId} = ${issue.id}
        and ${issueAssignee.organizationId} = ${issue.organizationId}
        and (
          position(${lowered} in lower(${user.name})) > 0
          or position(${lowered} in lower(coalesce(${user.email}, ''))) > 0
        )
    )`,
  ];
  const priorityLabels = issuePriorities.filter((priority) =>
    getIssuePriorityLabel(priority).toLowerCase().includes(lowered),
  );
  const categoryLabels = issueStatusCategories.filter((category) =>
    getIssueStatusCategoryLabel(category).toLowerCase().includes(lowered),
  );

  if (priorityLabels.length > 0) {
    matches.push(inArray(issue.priority, priorityLabels));
  }

  if (categoryLabels.length > 0) {
    matches.push(inArray(projectStatus.category, categoryLabels));
  }

  const searchedNumber = issueNumberSearchDecimal(lowered);

  if (searchedNumber !== undefined) {
    matches.push(sql`${issue.number} = ${searchedNumber}::bigint`);
  }

  /*
   * `i-` alone would match every code. Require at least one digit so a prefix
   * search such as `i-000` can find `I-0001` without matching the whole project.
   */
  if (needleMatchesIssueCodeText(lowered)) {
    matches.push(
      sql`position(${lowered} in ('i-' || lpad(${issue.number}::text, greatest(4, char_length(${issue.number}::text)), '0'))) > 0`,
    );
  }

  return sql`(${sql.join(matches, sql` or `)})`;
}

function buildIssueListWhere(
  organizationId: string,
  projectId: string,
  filters: IssueListFilters,
): SQL | undefined {
  const scope = and(eq(issue.organizationId, organizationId), eq(issue.projectId, projectId));

  /*
   * An unresolved `me` token is not "no assignee filter". Closing it avoids
   * showing every issue when a caller forgets to resolve the current member.
   */
  if (filters.unsatisfiable || filters.includeCurrentUser) {
    return and(scope, sql`false`);
  }

  const assigneeMatch =
    filters.includeUnassigned || filters.assignees.length > 0
      ? or(
          filters.includeUnassigned
            ? sql`not exists (
                select 1 from ${issueAssignee}
                where ${issueAssignee.issueId} = ${issue.id}
                  and ${issueAssignee.organizationId} = ${issue.organizationId}
              )`
            : undefined,
          filters.assignees.length > 0
            ? sql`exists (
                select 1 from ${issueAssignee}
                where ${issueAssignee.issueId} = ${issue.id}
                  and ${issueAssignee.organizationId} = ${issue.organizationId}
                  and ${inArray(issueAssignee.memberId, filters.assignees)}
              )`
            : undefined,
        )
      : undefined;

  return and(
    scope,
    filters.statusIds.length > 0 ? inArray(issue.statusId, filters.statusIds) : undefined,
    filters.priorities.length > 0 ? inArray(issue.priority, filters.priorities) : undefined,
    filters.categories.length > 0 ? inArray(projectStatus.category, filters.categories) : undefined,
    assigneeMatch,
    filters.numberMin === undefined
      ? undefined
      : sql`${issue.number} >= ${filters.numberMin}::bigint`,
    filters.numberMax === undefined
      ? undefined
      : sql`${issue.number} <= ${filters.numberMax}::bigint`,
    buildLiteralSearchCondition([issue.title], filters.title),
    buildLiteralSearchCondition([issue.contentText], filters.content),
    dateBounds(issue.createdAt, filters.timeZone, filters.createdFrom, filters.createdTo),
    dateBounds(issue.updatedAt, filters.timeZone, filters.updatedFrom, filters.updatedTo),
    buildIssueSearch(filters.q),
  );
}

export { buildIssueListWhere, buildIssueSearch, dateBounds, issueStatusJoin };
