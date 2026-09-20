import { relations } from "drizzle-orm";
import { foreignKey, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

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
  memberships: many(projectMembership),
  organization: one(organization, {
    fields: [project.organizationId],
    references: [organization.id],
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
