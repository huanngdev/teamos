CREATE TABLE "issue_view" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"visibility" text NOT NULL,
	"owner_member_id" text,
	"definition" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_by_member_id" text,
	"updated_by_member_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_view_visibility_owner_check" CHECK ((
        ("issue_view"."visibility" = 'personal' and "issue_view"."owner_member_id" is not null)
        or ("issue_view"."visibility" = 'project' and "issue_view"."owner_member_id" is null)
      )),
	CONSTRAINT "issue_view_revision_check" CHECK ("issue_view"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "issue_view" ADD CONSTRAINT "issue_view_created_by_member_id_member_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_view" ADD CONSTRAINT "issue_view_updated_by_member_id_member_id_fk" FOREIGN KEY ("updated_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_view" ADD CONSTRAINT "issue_view_project_fk" FOREIGN KEY ("project_id","organization_id") REFERENCES "public"."project"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_view" ADD CONSTRAINT "issue_view_owner_fk" FOREIGN KEY ("owner_member_id","organization_id") REFERENCES "public"."member"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_view_personal_owner_idx" ON "issue_view" USING btree ("organization_id","project_id","owner_member_id") WHERE "issue_view"."visibility" = 'personal';--> statement-breakpoint
CREATE INDEX "issue_view_project_idx" ON "issue_view" USING btree ("organization_id","project_id") WHERE "issue_view"."visibility" = 'project';