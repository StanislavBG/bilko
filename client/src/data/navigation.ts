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
    title: "AI Academy",
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
    adminOnly: true,
  },
  {
    id: "memory",
    title: "Memory Explorer",
    url: "/memory",
    icon: Activity,
    adminOnly: true,
  },
  {
    id: "flows",
    title: "Flow Explorer",
    url: "/flows",
    icon: Sparkles,
    adminOnly: true,
  },
  {
    id: "rules",
    title: "Rules Explorer",
    url: "/rules",
    icon: BookOpen,
    adminOnly: true,
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
