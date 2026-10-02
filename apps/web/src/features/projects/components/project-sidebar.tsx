import {
  CaretDownIcon,
  CaretRightIcon,
  FunnelIcon,
  GearIcon,
  KanbanIcon,
  ListChecksIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { Link, NavLink } from "react-router";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
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
                  <FunnelIcon className="text-muted-foreground" />
                  <span>Views</span>
                  <CaretRightIcon className="ml-auto transition-transform group-data-open/collapsible:rotate-90 motion-reduce:transition-none" />
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
                            isActive={view.activeViewId === item.id}
                            render={<NavLink to={item.path} />}
                          >
                            <span>{item.name}</span>
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
