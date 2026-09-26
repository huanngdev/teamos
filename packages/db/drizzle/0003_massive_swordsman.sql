CREATE TABLE "issue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"status_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" text DEFAULT 'none' NOT NULL,
	"position" integer NOT NULL,
	"assignee_member_id" text,
	"created_by_member_id" text,
	"updated_by_member_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_project_number_unique" UNIQUE("project_id","number")
);
--> statement-breakpoint
CREATE TABLE "project_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"position" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by_member_id" text,
	"updated_by_member_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_status_id_project_organization_unique" UNIQUE("id","project_id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_created_by_member_id_member_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_updated_by_member_id_member_id_fk" FOREIGN KEY ("updated_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_project_fk" FOREIGN KEY ("project_id","organization_id") REFERENCES "public"."project"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_status_fk" FOREIGN KEY ("status_id","project_id","organization_id") REFERENCES "public"."project_status"("id","project_id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_assignee_fk" FOREIGN KEY ("assignee_member_id","organization_id") REFERENCES "public"."member"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_status" ADD CONSTRAINT "project_status_created_by_member_id_member_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_status" ADD CONSTRAINT "project_status_updated_by_member_id_member_id_fk" FOREIGN KEY ("updated_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_status" ADD CONSTRAINT "project_status_project_fk" FOREIGN KEY ("project_id","organization_id") REFERENCES "public"."project"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_project_status_position_idx" ON "issue" USING btree ("organization_id","project_id","status_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "project_status_project_name_unique" ON "project_status" USING btree ("project_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "project_status_one_default" ON "project_status" USING btree ("project_id") WHERE "project_status"."is_default" = true;--> statement-breakpoint
CREATE INDEX "project_status_project_position_idx" ON "project_status" USING btree ("project_id","position");--> statement-breakpoint
-- Seed matches defaultProjectStatuses in apps/api/src/services/project-statuses.ts.
INSERT INTO "project_status" ("organization_id", "project_id", "name", "category", "position", "is_default")
SELECT "organization_id", "id", 'Backlog', 'backlog', 0, true FROM "project"
UNION ALL
SELECT "organization_id", "id", 'Todo', 'unstarted', 1000, false FROM "project"
UNION ALL
SELECT "organization_id", "id", 'In Progress', 'started', 2000, false FROM "project"
UNION ALL
SELECT "organization_id", "id", 'Done', 'completed', 3000, false FROM "project"
UNION ALL
SELECT "organization_id", "id", 'Canceled', 'canceled', 4000, false FROM "project";