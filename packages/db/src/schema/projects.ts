import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { member, organization } from "./auth.js";

/*
 * Projects belong to exactly one organization. Membership references both the
 * project and the member with the organization included in the same foreign
 * key, which makes a cross-tenant membership impossible at the database level.
 *
 * Audit columns intentionally reference `member(id)` alone. A composite
 * `ON DELETE SET NULL` would also try to null `organization_id`, which is
 * `NOT NULL`, so deleting an author would abort. The audit column is not used
 * for authorization, so losing tenant enforcement there is acceptable.
 */
export const project = pgTable(
  "project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    visibility: text("visibility").default("workspace").notNull(),
    createdByMemberId: text("created_by_member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    updatedByMemberId: text("updated_by_member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("project_organization_slug_unique").on(table.organizationId, table.slug),
    unique("project_id_organization_unique").on(table.id, table.organizationId),
    index("project_organizationId_idx").on(table.organizationId),
    index("project_organization_name_idx").on(table.organizationId, table.name),
  ],
);

export const projectMembership = pgTable(
  "project_membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    memberId: text("member_id").notNull(),
    role: text("role").default("member").notNull(),
    createdByMemberId: text("created_by_member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("project_membership_project_member_unique").on(table.projectId, table.memberId),
    index("project_membership_project_role_idx").on(table.projectId, table.role),
    index("project_membership_organization_member_idx").on(table.organizationId, table.memberId),
    foreignKey({
      columns: [table.projectId, table.organizationId],
      foreignColumns: [project.id, project.organizationId],
      name: "project_membership_project_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.memberId, table.organizationId],
      foreignColumns: [member.id, member.organizationId],
      name: "project_membership_member_fk",
    }).onDelete("cascade"),
  ],
);

export const projectRelations = relations(project, ({ one, many }) => ({
  issues: many(issue),
  memberships: many(projectMembership),
  organization: one(organization, {
    fields: [project.organizationId],
    references: [organization.id],
  }),
  statuses: many(projectStatus),
}));

/*
 * A status is a board column. `category` is the stable workflow meaning.
 * `name` is the user-facing title. `is_default` marks the inbox for new issues.
 * Position is not unique because a reorder rewrites every column in one transaction.
 */
export const projectStatus = pgTable(
  "project_status",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    position: integer("position").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdByMemberId: text("created_by_member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    updatedByMemberId: text("updated_by_member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("project_status_id_project_organization_unique").on(
      table.id,
      table.projectId,
      table.organizationId,
    ),
    uniqueIndex("project_status_project_name_unique").on(
      table.projectId,
      sql`lower(${table.name})`,
    ),
    uniqueIndex("project_status_one_default")
      .on(table.projectId)
      .where(sql`${table.isDefault} = true`),
    index("project_status_project_position_idx").on(table.projectId, table.position),
    foreignKey({
      columns: [table.projectId, table.organizationId],
      foreignColumns: [project.id, project.organizationId],
      name: "project_status_project_fk",
    }).onDelete("cascade"),
  ],
);

/*
 * Assignees live in `issue_assignee`. That foreign key is RESTRICT, so callers
 * must delete those rows before deleting the member. A composite ON DELETE SET
 * NULL would also try to null organization_id.
 */
export const issue = pgTable(
  "issue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    statusId: uuid("status_id").notNull(),
    number: bigint("number", { mode: "bigint" }).notNull(),
    title: text("title").notNull(),
    content: jsonb("content"),
    contentText: text("content_text").default("").notNull(),
    priority: text("priority").default("none").notNull(),
    position: integer("position").notNull(),
    createdByMemberId: text("created_by_member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    updatedByMemberId: text("updated_by_member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check("issue_number_check", sql`${table.number} >= 1`),
    check("issue_content_text_length_check", sql`char_length(${table.contentText}) <= 20000`),
    check(
      "issue_content_json_size_check",
      sql`${table.content} is null or octet_length(${table.content}::text) <= 1500000`,
    ),
    check(
      "issue_content_empty_check",
      sql`(${table.content} is null) = (${table.contentText} = '')`,
    ),
    unique("issue_project_number_unique").on(table.projectId, table.number),
    unique("issue_id_project_organization_unique").on(
      table.id,
      table.projectId,
      table.organizationId,
    ),
    index("issue_project_status_position_idx").on(
      table.organizationId,
      table.projectId,
      table.statusId,
      table.position,
      table.id,
    ),
    index("issue_project_created_idx").on(
      table.organizationId,
      table.projectId,
      table.createdAt,
      table.id,
    ),
    index("issue_project_priority_idx").on(
      table.organizationId,
      table.projectId,
      table.priority,
      table.id,
    ),
    index("issue_project_title_idx").on(
      table.organizationId,
      table.projectId,
      table.title,
      table.id,
    ),
    index("issue_project_updated_idx").on(
      table.organizationId,
      table.projectId,
      table.updatedAt,
      table.id,
    ),
    foreignKey({
      columns: [table.projectId, table.organizationId],
      foreignColumns: [project.id, project.organizationId],
      name: "issue_project_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.statusId, table.projectId, table.organizationId],
      foreignColumns: [projectStatus.id, projectStatus.projectId, projectStatus.organizationId],
      name: "issue_status_fk",
    }).onDelete("restrict"),
  ],
);

export const issueAssignee = pgTable(
  "issue_assignee",
  {
    issueId: uuid("issue_id").notNull(),
    memberId: text("member_id").notNull(),
    organizationId: text("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.issueId, table.memberId] }),
    index("issue_assignee_member_idx").on(table.organizationId, table.memberId),
    index("issue_assignee_project_member_idx").on(
      table.organizationId,
      table.projectId,
      table.memberId,
    ),
    foreignKey({
      columns: [table.issueId, table.projectId, table.organizationId],
      foreignColumns: [issue.id, issue.projectId, issue.organizationId],
      name: "issue_assignee_issue_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.memberId, table.organizationId],
      foreignColumns: [member.id, member.organizationId],
      name: "issue_assignee_member_fk",
    }).onDelete("restrict"),
  ],
);

/*
 * High-water mark for issue numbers. Create increments this row and never
 * reads max(issue.number) once the row exists, so a deleted number stays free.
 * The row is separate from `project` because issue create holds FOR SHARE on
 * the project row; updating that same row from two creates can deadlock.
 */
export const projectIssueCounter = pgTable(
  "project_issue_counter",
  {
    projectId: uuid("project_id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    lastNumber: bigint("last_number", { mode: "bigint" }).notNull(),
  },
  (table) => [
    check("project_issue_counter_last_number_check", sql`${table.lastNumber} >= 0`),
    foreignKey({
      columns: [table.projectId, table.organizationId],
      foreignColumns: [project.id, project.organizationId],
      name: "project_issue_counter_project_fk",
    }).onDelete("cascade"),
  ],
);

export const projectStatusRelations = relations(projectStatus, ({ one, many }) => ({
  issues: many(issue),
  project: one(project, {
    fields: [projectStatus.projectId],
    references: [project.id],
  }),
}));

export const issueRelations = relations(issue, ({ many, one }) => ({
  assignees: many(issueAssignee),
  project: one(project, {
    fields: [issue.projectId],
    references: [project.id],
  }),
  status: one(projectStatus, {
    fields: [issue.statusId],
    references: [projectStatus.id],
  }),
}));

export const issueAssigneeRelations = relations(issueAssignee, ({ one }) => ({
  issue: one(issue, {
    fields: [issueAssignee.issueId],
    references: [issue.id],
  }),
  member: one(member, {
    fields: [issueAssignee.memberId],
    references: [member.id],
  }),
}));

export const projectMembershipRelations = relations(projectMembership, ({ one }) => ({
  member: one(member, {
    fields: [projectMembership.memberId],
    references: [member.id],
  }),
  project: one(project, {
    fields: [projectMembership.projectId],
    references: [project.id],
  }),
}));
