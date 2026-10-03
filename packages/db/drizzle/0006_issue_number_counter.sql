CREATE TABLE "project_issue_counter" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"last_number" bigint NOT NULL,
	CONSTRAINT "project_issue_counter_last_number_check" CHECK ("project_issue_counter"."last_number" >= 0)
);
--> statement-breakpoint
ALTER TABLE "issue" ALTER COLUMN "number" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "project_issue_counter" ADD CONSTRAINT "project_issue_counter_project_fk" FOREIGN KEY ("project_id","organization_id") REFERENCES "public"."project"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "project_issue_counter" ("project_id", "organization_id", "last_number")
SELECT
  "project"."id",
  "project"."organization_id",
  COALESCE((
    SELECT MAX("issue"."number")
    FROM "issue"
    WHERE "issue"."project_id" = "project"."id"
      AND "issue"."organization_id" = "project"."organization_id"
  ), 0)
FROM "project";--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_number_check" CHECK ("issue"."number" >= 1);