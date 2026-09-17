-- This constraint must exist before the project foreign keys below reference
-- member(id, organization_id).
ALTER TABLE "member" ADD CONSTRAINT "member_id_organization_unique" UNIQUE("id","organization_id");--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"visibility" text DEFAULT 'workspace' NOT NULL,
	"created_by_member_id" text,
	"updated_by_member_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_organization_slug_unique" UNIQUE("organization_id","slug"),
	CONSTRAINT "project_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "project_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"member_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_by_member_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_membership_project_member_unique" UNIQUE("project_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_member_fk" FOREIGN KEY ("created_by_member_id","organization_id") REFERENCES "public"."member"("id","organization_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_updated_by_member_fk" FOREIGN KEY ("updated_by_member_id","organization_id") REFERENCES "public"."member"("id","organization_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_membership" ADD CONSTRAINT "project_membership_project_fk" FOREIGN KEY ("project_id","organization_id") REFERENCES "public"."project"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_membership" ADD CONSTRAINT "project_membership_member_fk" FOREIGN KEY ("member_id","organization_id") REFERENCES "public"."member"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_organizationId_idx" ON "project" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_organization_name_idx" ON "project" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "project_membership_project_role_idx" ON "project_membership" USING btree ("project_id","role");--> statement-breakpoint
CREATE INDEX "project_membership_organization_member_idx" ON "project_membership" USING btree ("organization_id","member_id");