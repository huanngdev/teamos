import { GearIcon, KanbanIcon, ListChecksIcon, SquaresFourIcon } from "@phosphor-icons/react";
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

interface ProjectSidebarView {
  boardActive: boolean;
  boardPath: string;
  isSigningOut: boolean;
  issuesActive: boolean;
  issuesPath: string;
  onSignOut: () => void;
  overviewActive: boolean;
  overviewPath: string;
  projectName: string | null;
  projectsPath: string;
  settingsActive: boolean;
  settingsPath: string;
  showSettings: boolean;
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
              <SidebarMenuItem className="not-first:mt-1">
                <SidebarMenuButton
                  isActive={view.overviewActive}
                  render={<NavLink end to={view.overviewPath} />}
                  tooltip="Overview"
                >
                  <SquaresFourIcon className="text-muted-foreground" />
                  <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem className="not-first:mt-1">
                <SidebarMenuButton
                  isActive={view.issuesActive}
                  render={<NavLink end to={view.issuesPath} />}
                  tooltip="Issues"
                >
                  <ListChecksIcon className="text-muted-foreground" />
                  <span>Issues</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem className="not-first:mt-1">
                <SidebarMenuButton
                  isActive={view.boardActive}
                  render={<NavLink end to={view.boardPath} />}
                  tooltip="Board"
                >
                  <KanbanIcon className="text-muted-foreground" />
                  <span>Board</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {view.showSettings ? (
                <SidebarMenuItem className="not-first:mt-1">
                  <SidebarMenuButton
                    isActive={view.settingsActive}
                    render={<NavLink end to={view.settingsPath} />}
                    tooltip="Settings"
                  >
                    <GearIcon className="text-muted-foreground" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
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
