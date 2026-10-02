DROP INDEX "issue_project_status_position_idx";--> statement-breakpoint
CREATE INDEX "issue_project_assignee_idx" ON "issue" USING btree ("organization_id","project_id","assignee_member_id");--> statement-breakpoint
CREATE INDEX "issue_project_created_idx" ON "issue" USING btree ("organization_id","project_id","created_at","id");--> statement-breakpoint
CREATE INDEX "issue_project_priority_idx" ON "issue" USING btree ("organization_id","project_id","priority","id");--> statement-breakpoint
CREATE INDEX "issue_project_title_idx" ON "issue" USING btree ("organization_id","project_id","title","id");--> statement-breakpoint
CREATE INDEX "issue_project_updated_idx" ON "issue" USING btree ("organization_id","project_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "issue_project_status_position_idx" ON "issue" USING btree ("organization_id","project_id","status_id","position","id");