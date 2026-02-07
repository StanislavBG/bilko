/**
 * NavPanel — Reusable collapsible navigation panel.
 *
 * The universal building block for L2/L3/L4 navigation.
 * Handles: header, scrollable item list, collapse/expand toggle.
 *
 * Used across academy (levels, dictionary, video), rules, projects.
 */

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PanelLeft } from "lucide-react";
import type { NavPanelProps } from "./types";
import { NavItem } from "./nav-item";

export function NavPanel({
  header,
  items,
  selectedId,
  onSelect,
  isCollapsed,
  onToggleCollapse,
  expandedWidth = "min-w-[9rem] max-w-[10rem]",
  collapsedWidth = "min-w-10 max-w-10",
  bg = "bg-muted/10",
  className = "",
  testId,
}: NavPanelProps) {
  return (
    <div
      className={`hidden md:flex shrink-0 border-r ${bg} flex-col transition-all duration-200 ${
        isCollapsed ? collapsedWidth : expandedWidth
      } ${className}`}
      data-testid={testId}
    >
      {/* Header */}
      <div className="border-b px-2 h-8 flex items-center shrink-0">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs font-medium text-muted-foreground block w-full text-center cursor-default">
                {header.charAt(0)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="right">{header}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs font-medium text-muted-foreground truncate">
            {header}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto p-1 space-y-0.5">
        {items.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isSelected={selectedId === item.id}
            isCollapsed={isCollapsed}
            onSelect={() => onSelect(item.id)}
          />
        ))}
      </div>

      {/* Collapse toggle */}
      <div className="border-t h-9 flex items-center justify-center shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleCollapse}
            >
              <PanelLeft
                className={`h-3 w-3 transition-transform ${
                  isCollapsed ? "rotate-180" : ""
                }`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
