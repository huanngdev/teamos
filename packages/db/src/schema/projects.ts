import { relations, sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
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
 * Assignee uses a composite foreign key with ON DELETE RESTRICT. A composite
 * ON DELETE SET NULL would also try to null organization_id. Callers must clear
 * assignee_member_id before deleting the member row.
 */
export const issue = pgTable(
  "issue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    statusId: uuid("status_id").notNull(),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority").default("none").notNull(),
    position: integer("position").notNull(),
    assigneeMemberId: text("assignee_member_id"),
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
    unique("issue_project_number_unique").on(table.projectId, table.number),
    index("issue_project_status_position_idx").on(
      table.organizationId,
      table.projectId,
      table.statusId,
      table.position,
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
    foreignKey({
      columns: [table.assigneeMemberId, table.organizationId],
      foreignColumns: [member.id, member.organizationId],
      name: "issue_assignee_fk",
    }).onDelete("restrict"),
  ],
);

export const projectStatusRelations = relations(projectStatus, ({ one, many }) => ({
  issues: many(issue),
  project: one(project, {
    fields: [projectStatus.projectId],
    references: [project.id],
  }),
}));

export const issueRelations = relations(issue, ({ one }) => ({
  assignee: one(member, {
    fields: [issue.assigneeMemberId],
    references: [member.id],
  }),
  project: one(project, {
    fields: [issue.projectId],
    references: [project.id],
  }),
  status: one(projectStatus, {
    fields: [issue.statusId],
    references: [projectStatus.id],
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
