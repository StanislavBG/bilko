import { Home, Activity, BookOpen } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useViewMode } from "@/contexts/view-mode-context";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
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
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { effectiveIsAdmin } = useViewMode();
  
  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || effectiveIsAdmin
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b h-8 flex items-center justify-center px-2 shrink-0">
        {isCollapsed ? (
          <span 
            className="font-bold text-lg"
            data-testid="logo-collapsed"
          >B</span>
        ) : (
          <span className="font-semibold text-lg" data-testid="logo-expanded">Bilko Bibitkov</span>
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
      <SidebarFooter className="border-t h-11 flex items-center justify-center shrink-0">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
