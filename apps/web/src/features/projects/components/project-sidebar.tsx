import {
  CaretDownIcon,
  CaretRightIcon,
  FunnelIcon,
  GearIcon,
  KanbanIcon,
  SquaresFourIcon,
  TableIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { AccountMenu, type AccountMenuUser } from "@/features/auth";
import { Logo } from "@/shared";

interface ProjectSidebarViewLink {
  id: string;
  name: string;
  path: string;
}

interface ProjectSidebarView {
  activeViewId: string | null;
  boardActive: boolean;
  boardPath: string;
  hasMoreViews: boolean;
  isSigningOut: boolean;
  issuesActive: boolean;
  issuesPath: string;
  loadingMoreViews: boolean;
  onLoadMoreViews: () => void;
  onOpenViews: () => void;
  onSignOut: () => void;
  onViewsExpandedChange: (open: boolean) => void;
  overviewActive: boolean;
  overviewPath: string;
  projectName: string | null;
  projectsPath: string;
  savedViews: readonly ProjectSidebarViewLink[];
  settingsActive: boolean;
  settingsPath: string;
  showSettings: boolean;
  viewsActive: boolean;
  viewsExpanded: boolean;
  viewsPath: string;
  user: AccountMenuUser;
}

interface ProjectSidebarProps {
  view: ProjectSidebarView;
}

function ProjectNavIcon({ active, icon: NavIcon }: { active: boolean; icon: Icon }) {
  return (
    <NavIcon
      className="text-muted-foreground group-hover/menu-button:text-sidebar-accent-foreground group-data-active/menu-button:text-sidebar-accent-foreground"
      weight={active ? "fill" : "regular"}
    />
  );
}

function ProjectNavLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-muted-foreground group-hover/menu-button:text-sidebar-accent-foreground group-data-active/menu-button:text-sidebar-accent-foreground">
      {children}
    </span>
  );
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
                  render={
                    <Link
                      aria-current={view.overviewActive ? "page" : undefined}
                      to={view.overviewPath}
                    />
                  }
                  tooltip="Overview"
                >
                  <ProjectNavIcon active={view.overviewActive} icon={SquaresFourIcon} />
                  <ProjectNavLabel>Overview</ProjectNavLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem className="not-first:mt-1">
                <SidebarMenuButton
                  isActive={view.issuesActive}
                  render={
                    <Link
                      aria-current={view.issuesActive ? "page" : undefined}
                      to={view.issuesPath}
                    />
                  }
                  tooltip="Issues"
                >
                  <ProjectNavIcon active={view.issuesActive} icon={TableIcon} />
                  <ProjectNavLabel>Issues</ProjectNavLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem className="not-first:mt-1">
                <SidebarMenuButton
                  isActive={view.boardActive}
                  render={
                    <Link
                      aria-current={view.boardActive ? "page" : undefined}
                      to={view.boardPath}
                    />
                  }
                  tooltip="Board"
                >
                  <ProjectNavIcon active={view.boardActive} icon={KanbanIcon} />
                  <ProjectNavLabel>Board</ProjectNavLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <Collapsible
                className="group/collapsible not-first:mt-1"
                render={<SidebarMenuItem />}
                onOpenChange={(open) => {
                  view.onViewsExpandedChange(open);
                  if (open) {
                    view.onOpenViews();
                  }
                }}
                open={view.viewsExpanded}
              >
                <SidebarMenuButton
                  isActive={view.viewsActive}
                  render={<CollapsibleTrigger />}
                  tooltip="Views"
                >
                  <ProjectNavIcon active={view.viewsActive} icon={FunnelIcon} />
                  <ProjectNavLabel>Views</ProjectNavLabel>
                  <CaretRightIcon className="ml-auto text-muted-foreground transition-transform group-hover/menu-button:text-sidebar-accent-foreground group-data-open/collapsible:rotate-90 group-data-active/menu-button:text-sidebar-accent-foreground motion-reduce:transition-none" />
                </SidebarMenuButton>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {view.savedViews.length === 0 ? (
                      <SidebarMenuSubItem>
                        <span className="px-2 text-sm text-muted-foreground">No views yet</span>
                      </SidebarMenuSubItem>
                    ) : (
                      view.savedViews.map((item) => (
                        <SidebarMenuSubItem key={item.id}>
                          <SidebarMenuSubButton
                            className="group/view-link"
                            isActive={view.activeViewId === item.id}
                            render={
                              <Link
                                aria-current={view.activeViewId === item.id ? "page" : undefined}
                                to={item.path}
                              />
                            }
                          >
                            <span className="text-muted-foreground group-hover/view-link:text-sidebar-accent-foreground group-data-active/view-link:text-sidebar-accent-foreground">
                              {item.name}
                            </span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))
                    )}
                    {view.hasMoreViews ? (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={view.onLoadMoreViews}
                          render={<button disabled={view.loadingMoreViews} type="button" />}
                        >
                          <CaretDownIcon />
                          <span>{view.loadingMoreViews ? "Loading views" : "Load more"}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ) : null}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
              {view.showSettings ? (
                <SidebarMenuItem className="not-first:mt-1">
                  <SidebarMenuButton
                    isActive={view.settingsActive}
                    render={
                      <Link
                        aria-current={view.settingsActive ? "page" : undefined}
                        to={view.settingsPath}
                      />
                    }
                    tooltip="Settings"
                  >
                    <ProjectNavIcon active={view.settingsActive} icon={GearIcon} />
                    <ProjectNavLabel>Settings</ProjectNavLabel>
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
