/*
 * Guard against pre-existing duplicate membership rows before the unique
 * constraint is added. The highest-privilege row is kept so an owner or admin is
 * never dropped in favor of a plain member. This is a no-op on healthy data.
 */
DELETE FROM "member" AS duplicate
USING "member" AS keeper
WHERE duplicate.organization_id = keeper.organization_id
  AND duplicate.user_id = keeper.user_id
  AND duplicate.id <> keeper.id
  AND (
    (
      CASE
        WHEN keeper.role LIKE '%owner%' THEN 3
        WHEN keeper.role LIKE '%admin%' THEN 2
        ELSE 1
      END,
      keeper.created_at,
      keeper.id
    )
    >
    (
      CASE
        WHEN duplicate.role LIKE '%owner%' THEN 3
        WHEN duplicate.role LIKE '%admin%' THEN 2
        ELSE 1
      END,
      duplicate.created_at,
      duplicate.id
    )
  );
--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_created_by_member_fk";
--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_updated_by_member_fk";
--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_member_id_member_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_updated_by_member_id_member_id_fk" FOREIGN KEY ("updated_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_membership" ADD CONSTRAINT "project_membership_created_by_member_id_member_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_user_unique" UNIQUE("organization_id","user_id");