import { Home, Settings, Activity, BookOpen, LogOut, Eye, EyeOff } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useViewMode } from "@/contexts/view-mode-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { User } from "@shared/models/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
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

const globalItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    disabled: true,
  },
];

interface AppSidebarProps {
  user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [location] = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { effectiveIsAdmin, isViewingAsUser, toggleViewMode, canToggleViewMode } = useViewMode();
  
  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || effectiveIsAdmin
  );

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n?.[0])
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between px-2 py-2 gap-2">
          {isCollapsed ? (
            <div 
              className="h-8 w-8 rounded-md bg-primary flex items-center justify-center"
              data-testid="logo-collapsed"
            >
              <span className="text-primary-foreground font-bold text-sm">B</span>
            </div>
          ) : (
            <span className="font-semibold text-lg" data-testid="logo-expanded">Bilko Bibitkov</span>
          )}
          <SidebarTrigger data-testid="button-sidebar-toggle" />
        </div>
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
        <SidebarGroup>
          <SidebarGroupLabel>Global</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {globalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    disabled={item.disabled}
                    className={item.disabled ? "opacity-50 cursor-not-allowed" : ""}
                    data-testid={`nav-${item.title.toLowerCase()}${item.disabled ? "-disabled" : ""}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImageUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate flex-1" data-testid="text-username">
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {canToggleViewMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleViewMode}
                  data-testid="button-toggle-view-mode"
                >
                  {isViewingAsUser ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {isViewingAsUser ? "Exit user view" : "View as user"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isViewingAsUser ? "Exit user view" : "View as user"}
              </TooltipContent>
            </Tooltip>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild data-testid="button-logout">
            <a href="/api/logout">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign out</span>
            </a>
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
