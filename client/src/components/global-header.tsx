import { LogOut, Eye, EyeOff } from "lucide-react";
import { useViewMode } from "@/contexts/view-mode-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { User } from "@shared/models/auth";

interface GlobalHeaderProps {
  user: User;
}

export function GlobalHeader({ user }: GlobalHeaderProps) {
  const { isViewingAsUser, toggleViewMode, canToggleViewMode } = useViewMode();

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n?.[0])
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";

  return (
    <header className="h-12 shrink-0 border-b bg-background flex items-center justify-end gap-2 px-4" data-testid="global-header">
      <div className="flex items-center gap-2 mr-auto">
        <Avatar className="h-7 w-7">
          <AvatarImage src={user.profileImageUrl ?? undefined} alt={displayName} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium" data-testid="text-username">
          {displayName}
        </span>
      </div>

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
    </header>
  );
}
