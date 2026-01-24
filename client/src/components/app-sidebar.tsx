import { Home, Activity, BookOpen } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useViewMode } from "@/contexts/view-mode-context";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
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
  const { effectiveIsAdmin } = useViewMode();
  
  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || effectiveIsAdmin
  );

  return (
    <Sidebar collapsible="icon">
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
      <SidebarRail />
    </Sidebar>
  );
}
