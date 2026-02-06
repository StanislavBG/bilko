import { Activity, BookOpen, Workflow, FolderOpen, GraduationCap, Sparkles, type LucideIcon } from "lucide-react";

export interface NavItem {
  id: string;
  title: string;
  url?: string;
  icon?: LucideIcon;
  children?: NavItem[];
  adminOnly?: boolean;
}

export const navigationItems: NavItem[] = [
  {
    id: "academy",
    title: "Mental Gym",
    url: "/academy",
    icon: GraduationCap,
    adminOnly: false,
  },
  {
    id: "projects",
    title: "Bilko's Projects",
    url: "/projects",
    icon: FolderOpen,
    adminOnly: false,
  },
  {
    id: "workflows",
    title: "Agentic Workflows",
    url: "/workflows",
    icon: Workflow,
    adminOnly: false,
  },
  {
    id: "memory",
    title: "Memory Explorer",
    url: "/memory",
    icon: Activity,
    adminOnly: false,
  },
  {
    id: "flows",
    title: "Flow Explorer",
    url: "/flows",
    icon: Sparkles,
    adminOnly: false,
  },
  {
    id: "rules",
    title: "Rules Explorer",
    url: "/rules",
    icon: BookOpen,
    adminOnly: false,
  },
];

export function filterNavItems(items: NavItem[], isAdmin: boolean): NavItem[] {
  return items
    .filter((item) => !item.adminOnly || isAdmin)
    .map((item) => ({
      ...item,
      children: item.children ? filterNavItems(item.children, isAdmin) : undefined,
    }));
}
