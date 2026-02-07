/**
 * NavItem — Single item in a NavPanel.
 *
 * Handles collapsed/expanded rendering, icon display,
 * active state, color coding, and tooltip on collapse.
 */

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NavPanelItem } from "./types";

interface NavItemProps {
  item: NavPanelItem;
  isSelected: boolean;
  isCollapsed: boolean;
  onSelect: () => void;
}

export function NavItem({ item, isSelected, isCollapsed, onSelect }: NavItemProps) {
  const Icon = item.icon;
  const shortLabel = item.shortLabel ?? item.label.charAt(0);

  // Active/hover background classes (support per-item color coding)
  const activeBg = item.activeBg ?? "bg-accent text-accent-foreground";
  const hoverBg = item.hoverBg ?? "";

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-center h-8 ${
              isSelected ? activeBg : hoverBg
            }`}
            onClick={onSelect}
          >
            {Icon ? (
              <Icon className={`h-4 w-4 ${item.color ?? ""}`} />
            ) : (
              <span className={`text-sm font-medium ${item.color ?? ""}`}>
                {shortLabel}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.label}
          {item.description ? `: ${item.description}` : ""}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expanded view — with or without description
  if (item.description) {
    return (
      <Button
        variant="ghost"
        className={`w-full justify-start h-auto py-2 px-2 ${
          isSelected ? activeBg : hoverBg
        }`}
        onClick={onSelect}
      >
        {Icon && <Icon className={`h-4 w-4 mr-2 shrink-0 ${item.color ?? ""}`} />}
        <div className="flex flex-col items-start gap-0.5 min-w-0">
          <span className={`text-sm ${item.color ?? ""}`}>{item.label}</span>
          <span className="text-xs text-muted-foreground truncate w-full text-left">
            {item.description}
          </span>
        </div>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      className={`w-full justify-start h-auto py-1.5 px-2 ${
        isSelected ? activeBg : hoverBg
      }`}
      onClick={onSelect}
    >
      {Icon && <Icon className={`h-4 w-4 mr-2 shrink-0 ${item.color ?? ""}`} />}
      <span className={`text-sm truncate ${item.color ?? ""}`}>{item.label}</span>
    </Button>
  );
}
