import { useState } from "react";
import { PanelLeft, ChevronRight, ChevronLeft } from "lucide-react";
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
import { navigationItems, filterNavItems, type NavItem } from "@/data/navigation";

interface NavLevel {
  title: string;
  items: NavItem[];
}

// ── Mobile sidebar: pure render ─────────────────────────────

interface MobileSidebarProps {
  level: NavLevel;
  canGoBack: boolean;
  isActive: (item: NavItem) => boolean;
  onItemClick: (item: NavItem) => void;
  onBack: () => void;
}

function MobileSidebarContent({ level, canGoBack, isActive, onItemClick, onBack }: MobileSidebarProps) {
  return (
    <>
      <SidebarHeader className="h-11 flex items-center border-b shrink-0 px-2 gap-2">
        {canGoBack && (
          <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-nav-back">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <span className="font-semibold text-xs whitespace-nowrap" data-testid="sidebar-title">
          {level.title}
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {level.items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={isActive(item)}
                    data-testid={`nav-${item.id}`}
                    onClick={() => onItemClick(item)}
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    <span>{item.title}</span>
                    {item.children && <ChevronRight className="ml-auto h-4 w-4" />}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t h-9 flex items-center justify-center shrink-0 p-0" />
    </>
  );
}

// ── Desktop nav item: pure render ───────────────────────────

function DesktopNavItem({
  item,
  isCollapsed,
  isItemActive,
  location,
}: {
  item: NavItem;
  isCollapsed: boolean;
  isItemActive: boolean;
  location: string;
}) {
  if (!item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isItemActive} data-testid={`nav-${item.id}`}>
          <Link href={item.url || "#"}>
            {item.icon && <item.icon className="h-4 w-4" />}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton asChild isActive={isItemActive} data-testid={`nav-${item.id}`}>
              <Link href={item.children[0]?.url || "#"}>
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isItemActive} data-testid={`nav-${item.id}`}>
            {item.icon && <item.icon className="h-4 w-4" />}
            <span>{item.title}</span>
            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.id}>
                <SidebarMenuSubButton
                  asChild
                  isActive={location === child.url}
                  data-testid={`nav-${child.id}`}
                >
                  <Link href={child.url || "#"}>{child.title}</Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

// ── Desktop sidebar: pure render ────────────────────────────

interface DesktopSidebarProps {
  items: NavItem[];
  isCollapsed: boolean;
  location: string;
  isActive: (item: NavItem) => boolean;
  onToggle: () => void;
}

function DesktopSidebarContent({ items, isCollapsed, location, isActive, onToggle }: DesktopSidebarProps) {
  return (
    <>
      <SidebarHeader className="h-11 flex items-center justify-center border-b shrink-0 px-2">
        {isCollapsed ? (
          <span className="font-bold text-base" data-testid="sidebar-logo-collapsed">B</span>
        ) : (
          <span className="font-semibold text-xs whitespace-nowrap" data-testid="sidebar-logo-expanded">
            Bilko's AI School
          </span>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Applications</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <DesktopNavItem
                  key={item.id}
                  item={item}
                  isCollapsed={isCollapsed}
                  isItemActive={isActive(item)}
                  location={location}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t h-9 flex items-center justify-center shrink-0 p-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" onClick={onToggle} data-testid="button-toggle-sidebar">
              <PanelLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
      </SidebarFooter>
    </>
  );
}

// ── AppSidebar: logic orchestrator ──────────────────────────

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { effectiveIsAdmin } = useViewMode();
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  const visibleNavItems = filterNavItems(navigationItems, effectiveIsAdmin);

  const rootLevel: NavLevel = { title: "Bilko's AI School", items: visibleNavItems };
  const [navStack, setNavStack] = useState<NavLevel[]>([rootLevel]);

  const currentLevel = navStack[navStack.length - 1];
  const canGoBack = navStack.length > 1;

  const isActive = (item: NavItem): boolean => {
    if (item.url) {
      if (item.url === "/") return location === "/";
      return location === item.url || location.startsWith(item.url + "/");
    }
    if (item.children) {
      return item.children.some(child => isActive(child));
    }
    return false;
  };

  const handleMobileItemClick = (item: NavItem) => {
    if (item.children) {
      setNavStack([...navStack, { title: item.title, items: item.children }]);
    } else if (item.url) {
      setLocation(item.url);
      setOpenMobile(false);
      setNavStack([rootLevel]);
    }
  };

  const handleMobileBack = () => {
    if (canGoBack) {
      setNavStack(navStack.slice(0, -1));
    }
  };

  return (
    <Sidebar collapsible="offcanvas">
      {isMobile ? (
        <MobileSidebarContent
          level={currentLevel}
          canGoBack={canGoBack}
          isActive={isActive}
          onItemClick={handleMobileItemClick}
          onBack={handleMobileBack}
        />
      ) : (
        <DesktopSidebarContent
          items={visibleNavItems}
          isCollapsed={isCollapsed}
          location={location}
          isActive={isActive}
          onToggle={toggleSidebar}
        />
      )}
    </Sidebar>
  );
}
