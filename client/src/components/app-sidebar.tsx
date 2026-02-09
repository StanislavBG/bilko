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

  const handleNavigate = (url: string) => {
    setLocation(url);
    if (isMobile) {
      setOpenMobile(false);
      setNavStack([rootLevel]);
    }
  };

  const handleDrillInto = (item: NavItem) => {
    if (item.children) {
      setNavStack([...navStack, { title: item.title, items: item.children }]);
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      setNavStack(navStack.slice(0, -1));
    }
  };

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

  const renderMobileLevel = () => (
    <>
      <SidebarHeader className="h-11 flex items-center border-b shrink-0 px-2 gap-2">
        {canGoBack && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleBack}
            data-testid="button-nav-back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <span className="font-semibold text-xs whitespace-nowrap" data-testid="sidebar-title">
          {currentLevel.title}
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {currentLevel.items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={isActive(item)}
                    data-testid={`nav-${item.id}`}
                    onClick={() => {
                      if (item.children) {
                        handleDrillInto(item);
                      } else if (item.url) {
                        handleNavigate(item.url);
                      }
                    }}
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

  const renderDesktopItem = (item: NavItem) => {
    if (item.children) {
      if (isCollapsed) {
        return (
          <SidebarMenuItem key={item.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item)}
                  data-testid={`nav-${item.id}`}
                >
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
        <Collapsible key={item.id} defaultOpen className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                isActive={isActive(item)}
                data-testid={`nav-${item.id}`}
              >
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

    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item)}
          data-testid={`nav-${item.id}`}
        >
          <Link href={item.url || "#"}>
            {item.icon && <item.icon className="h-4 w-4" />}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderDesktopLevel = () => (
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
              {visibleNavItems.map((item) => renderDesktopItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t h-9 flex items-center justify-center shrink-0 p-0">
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
    </>
  );

  return (
    <Sidebar collapsible="offcanvas">
      {isMobile ? renderMobileLevel() : renderDesktopLevel()}
    </Sidebar>
  );
}
