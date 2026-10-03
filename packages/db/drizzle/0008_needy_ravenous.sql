CREATE TABLE "issue_assignee" (
	"issue_id" uuid NOT NULL,
	"member_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_assignee_issue_id_member_id_pk" PRIMARY KEY("issue_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_id_project_organization_unique" UNIQUE("id","project_id","organization_id");
--> statement-breakpoint
ALTER TABLE "issue_assignee" ADD CONSTRAINT "issue_assignee_issue_fk" FOREIGN KEY ("issue_id","project_id","organization_id") REFERENCES "public"."issue"("id","project_id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_assignee" ADD CONSTRAINT "issue_assignee_member_fk" FOREIGN KEY ("member_id","organization_id") REFERENCES "public"."member"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_assignee_member_idx" ON "issue_assignee" USING btree ("organization_id","member_id");--> statement-breakpoint
CREATE INDEX "issue_assignee_project_member_idx" ON "issue_assignee" USING btree ("organization_id","project_id","member_id");--> statement-breakpoint
INSERT INTO "issue_assignee" ("issue_id", "member_id", "organization_id", "project_id")
SELECT "id", "assignee_member_id", "organization_id", "project_id"
FROM "issue"
WHERE "assignee_member_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "issue" DROP CONSTRAINT "issue_assignee_fk";
--> statement-breakpoint
DROP INDEX "issue_project_assignee_idx";--> statement-breakpoint
ALTER TABLE "issue" DROP COLUMN "assignee_member_id";
