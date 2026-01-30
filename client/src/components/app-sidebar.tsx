import { useState } from "react";
import { Home, Activity, BookOpen, Workflow, PanelLeft, FolderOpen, ChevronRight, ChevronLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useViewMode } from "@/contexts/view-mode-context";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { projects } from "@/data/projects";

type DrillLevel = "main" | "projects";

const navItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
    adminOnly: false,
  },
  {
    title: "Agentic Workflows",
    url: "/workflows",
    icon: Workflow,
    adminOnly: true,
  },
  {
    title: "Memory Explorer",
    url: "/memory",
    icon: Activity,
    adminOnly: true,
  },
  {
    title: "Rules Explorer",
    url: "/rules",
    icon: BookOpen,
    adminOnly: true,
  },
];


export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { effectiveIsAdmin } = useViewMode();
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("main");
  
  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || effectiveIsAdmin
  );

  const handleNavigate = (url: string) => {
    setLocation(url);
    if (isMobile) {
      setOpenMobile(false);
      setDrillLevel("main");
    }
  };

  const handleDrillInto = (level: DrillLevel) => {
    setDrillLevel(level);
  };

  const handleBack = () => {
    setDrillLevel("main");
  };

  const renderMainLevel = () => (
    <>
      <SidebarHeader className="h-11 flex items-center justify-center border-b shrink-0 px-2">
        {isCollapsed && !isMobile ? (
          <span className="font-bold text-base" data-testid="sidebar-logo-collapsed">B</span>
        ) : (
          <span className="font-semibold text-xs whitespace-nowrap" data-testid="sidebar-logo-expanded">
            Bilko Bibitkov AI Academy
          </span>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Applications</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.filter(item => item.url === "/").map((item) => (
                <SidebarMenuItem key={item.title}>
                  {isMobile ? (
                    <SidebarMenuButton
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      onClick={() => handleNavigate(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
              
              {isMobile ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.startsWith("/projects")}
                    data-testid="nav-projects"
                    onClick={() => handleDrillInto("projects")}
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>Projects</span>
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : isCollapsed ? (
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        asChild
                        isActive={location.startsWith("/projects")}
                        data-testid="nav-projects"
                      >
                        <Link href="/projects">
                          <FolderOpen className="h-4 w-4" />
                          <span>Projects</span>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">Projects</TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              ) : (
                <Collapsible defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={location.startsWith("/projects")}
                        data-testid="nav-projects"
                      >
                        <FolderOpen className="h-4 w-4" />
                        <span>Projects</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/projects"}
                            data-testid="nav-projects-all"
                          >
                            <Link href="/projects">All Projects</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {projects.map((project) => (
                          <SidebarMenuSubItem key={project.id}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location === `/projects/${project.id}`}
                              data-testid={`nav-project-${project.id}`}
                            >
                              <Link href={`/projects/${project.id}`}>{project.title}</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {visibleNavItems.filter(item => item.url !== "/").map((item) => (
                <SidebarMenuItem key={item.title}>
                  {isMobile ? (
                    <SidebarMenuButton
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      onClick={() => handleNavigate(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t h-11 flex items-center justify-center shrink-0 p-0">
        {!isMobile && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => toggleSidebar()}
                data-testid="button-toggle-sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? "Expand" : "Collapse"}
            </TooltipContent>
          </Tooltip>
        )}
      </SidebarFooter>
    </>
  );

  const renderProjectsLevel = () => (
    <>
      <SidebarHeader className="h-11 flex items-center border-b shrink-0 px-2 gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleBack}
          data-testid="button-nav-back"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-xs whitespace-nowrap">Projects</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/projects"}
                  data-testid="nav-projects-all-mobile"
                  onClick={() => handleNavigate("/projects")}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>All Projects</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    isActive={location === `/projects/${project.id}`}
                    data-testid={`nav-project-${project.id}-mobile`}
                    onClick={() => handleNavigate(`/projects/${project.id}`)}
                  >
                    <span>{project.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t h-11 flex items-center justify-center shrink-0 p-0" />
    </>
  );

  return (
    <Sidebar collapsible="icon">
      {isMobile && drillLevel === "projects" ? renderProjectsLevel() : renderMainLevel()}
    </Sidebar>
  );
}
