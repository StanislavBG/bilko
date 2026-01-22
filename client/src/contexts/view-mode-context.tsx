import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

interface ViewModeContextType {
  isViewingAsUser: boolean;
  effectiveIsAdmin: boolean;
  toggleViewMode: () => void;
  canToggleViewMode: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isViewingAsUser, setIsViewingAsUser] = useState(false);

  const actualIsAdmin = user?.isAdmin ?? false;
  const canToggleViewMode = actualIsAdmin;
  const effectiveIsAdmin = actualIsAdmin && !isViewingAsUser;

  const toggleViewMode = useCallback(() => {
    if (canToggleViewMode) {
      setIsViewingAsUser((prev) => !prev);
    }
  }, [canToggleViewMode]);

  return (
    <ViewModeContext.Provider
      value={{
        isViewingAsUser,
        effectiveIsAdmin,
        toggleViewMode,
        canToggleViewMode,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error("useViewMode must be used within a ViewModeProvider");
  }
  return context;
}
