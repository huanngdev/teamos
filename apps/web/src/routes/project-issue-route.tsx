import { Navigate } from "react-router";

import { IssueDetail } from "@/features/issues/components/issue-detail";
import { useIssueDetail } from "@/features/issues/hooks/use-issue-detail";
import { NotFoundRoute } from "@/routes/not-found-route";

function ProjectIssueRoute() {
  const detail = useIssueDetail();

  if (detail.status === "redirect") {
    return <Navigate replace state={detail.state} to={detail.to} />;
  }

  if (detail.status === "not-found") {
    return <NotFoundRoute />;
  }

  return <IssueDetail state={detail} />;
}

export { ProjectIssueRoute };
