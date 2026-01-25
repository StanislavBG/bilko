import { Home, Activity, BookOpen, Workflow, PanelLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useViewMode } from "@/contexts/view-mode-context";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  useSidebar,
} from "@/components/ui/sidebar";

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
  const [location] = useLocation();
  const { effectiveIsAdmin } = useViewMode();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  
  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || effectiveIsAdmin
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-11 flex items-center justify-center border-b shrink-0 px-2">
        {isCollapsed ? (
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
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
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
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t h-11 flex items-center justify-center shrink-0 p-0">
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
      </SidebarFooter>
    </Sidebar>
  );
}
