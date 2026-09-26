import { ListChecksIcon } from "@phosphor-icons/react";
import { Link, NavLink } from "react-router";

import { AccountMenu, type AccountMenuUser } from "@/features/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "@/shared";
import { SquaresFourIcon } from "@phosphor-icons/react";

interface ProjectSidebarView {
  isSigningOut: boolean;
  issuesActive: boolean;
  issuesPath: string;
  onSignOut: () => void;
  overviewActive: boolean;
  overviewPath: string;
  projectName: string | null;
  projectsPath: string;
  user: AccountMenuUser;
}

interface ProjectSidebarProps {
  view: ProjectSidebarView;
}

function ProjectSidebar({ view }: ProjectSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to={view.projectsPath} />} tooltip="TeamOS">
              <Logo alt="" size="1.25rem" />
              <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">
                TeamOS
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {view.projectName === null ? null : (
            <SidebarGroupLabel>
              <span className="truncate">{view.projectName}</span>
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view.overviewActive}
                  render={<NavLink end to={view.overviewPath} />}
                  tooltip="Overview"
                >
                  <SquaresFourIcon className="text-muted-foreground" />
                  <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view.issuesActive}
                  render={<NavLink end to={view.issuesPath} />}
                  tooltip="Issues"
                >
                  <ListChecksIcon className="text-muted-foreground" />
                  <span>Issues</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <AccountMenu
            isSigningOut={view.isSigningOut}
            onSignOut={view.onSignOut}
            user={view.user}
            variant="sidebar"
          />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export { ProjectSidebar, type ProjectSidebarView };
