import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { member } from "./auth.js";
import { project } from "./projects.js";

/*
 * A view stores a filter configuration, not a copy of the issues. Personal
 * views belong to one member and disappear with that member. Project views
 * stay available to anyone who can see the project, so their owner is null.
 */
export const issueView = pgTable(
  "issue_view",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    name: text("name").notNull(),
    visibility: text("visibility").notNull(),
    ownerMemberId: text("owner_member_id"),
    definition: jsonb("definition").$type<Record<string, unknown>>().notNull(),
    revision: integer("revision").default(1).notNull(),
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
    check(
      "issue_view_visibility_owner_check",
      sql`(
        (${table.visibility} = 'personal' and ${table.ownerMemberId} is not null)
        or (${table.visibility} = 'project' and ${table.ownerMemberId} is null)
      )`,
    ),
    check("issue_view_revision_check", sql`${table.revision} >= 1`),
    index("issue_view_personal_owner_idx")
      .on(table.organizationId, table.projectId, table.ownerMemberId)
      .where(sql`${table.visibility} = 'personal'`),
    index("issue_view_project_idx")
      .on(table.organizationId, table.projectId)
      .where(sql`${table.visibility} = 'project'`),
    foreignKey({
      columns: [table.projectId, table.organizationId],
      foreignColumns: [project.id, project.organizationId],
      name: "issue_view_project_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.ownerMemberId, table.organizationId],
      foreignColumns: [member.id, member.organizationId],
      name: "issue_view_owner_fk",
    }).onDelete("cascade"),
  ],
);
