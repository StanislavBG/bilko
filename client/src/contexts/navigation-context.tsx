/**
 * Navigation Context - Unified multi-level navigation framework
 *
 * Manages collapse/expand state for hierarchical navigation with these rules:
 * - When selecting at level X: expand X-1 (adjacent), collapse X-2 (2 steps away)
 * - L1 (sidebar) is managed separately via useSidebar hook
 * - Levels 2-4 are managed here
 *
 * Usage:
 * 1. Wrap your app in NavigationProvider
 * 2. Use useNavigation() hook in components
 * 3. Call selectAtLevel(level, itemId) to select items with auto-collapse
 * 4. Call toggleCollapse(level) for manual collapse toggles
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSidebar } from "@/components/ui/sidebar";

interface NavLevelState {
  isCollapsed: boolean;
  selectedId: string | null;
}

interface NavigationContextType {
  // Level states (L2, L3, L4)
  levels: {
    L2: NavLevelState;
    L3: NavLevelState;
    L4: NavLevelState;
  };

  // Select an item at a level - applies collapse rules automatically
  selectAtLevel: (level: 2 | 3 | 4, itemId: string | null) => void;

  // Manual collapse control
  toggleCollapse: (level: 2 | 3 | 4) => void;
  setCollapsed: (level: 2 | 3 | 4, collapsed: boolean) => void;

  // Convenience getters
  isCollapsed: (level: 2 | 3 | 4) => boolean;
  getSelectedId: (level: 2 | 3 | 4) => string | null;

  // Reset all navigation state
  resetAll: () => void;

  // Go back from a level (clears selection and restores adjacent)
  goBack: (fromLevel: 2 | 3 | 4) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

const initialLevelState: NavLevelState = {
  isCollapsed: false,
  selectedId: null,
};

export function NavigationProvider({ children }: { children: ReactNode }) {
  const { setOpen: setL1Open } = useSidebar();

  const [L2, setL2] = useState<NavLevelState>({ ...initialLevelState });
  const [L3, setL3] = useState<NavLevelState>({ ...initialLevelState });
  const [L4, setL4] = useState<NavLevelState>({ ...initialLevelState });

  /**
   * Core selection logic with collapse rules:
   * - When selecting at level X:
   *   - Expand X-1 (adjacent level should be visible)
   *   - Collapse X-2 (2 steps away collapses)
   */
  const selectAtLevel = useCallback(
    (level: 2 | 3 | 4, itemId: string | null) => {
      // Set the selection
      switch (level) {
        case 2:
          setL2((prev) => ({ ...prev, selectedId: itemId }));
          if (itemId) {
            // L2 selection: expand L1 (adjacent, but L1 is sidebar - leave it)
            // No X-2 for L2
          }
          break;
        case 3:
          setL3((prev) => ({ ...prev, selectedId: itemId }));
          if (itemId) {
            // L3 selection: expand L2 (adjacent), collapse L1 (X-2)
            setL2((prev) => ({ ...prev, isCollapsed: false }));
            setL1Open(false);
          }
          break;
        case 4:
          setL4((prev) => ({ ...prev, selectedId: itemId }));
          if (itemId) {
            // L4 selection: expand L3 (adjacent), collapse L2 (X-2), collapse L1 (X-3)
            setL3((prev) => ({ ...prev, isCollapsed: false }));
            setL2((prev) => ({ ...prev, isCollapsed: true }));
            setL1Open(false);
          }
          break;
      }
    },
    [setL1Open]
  );

  const toggleCollapse = useCallback((level: 2 | 3 | 4) => {
    switch (level) {
      case 2:
        setL2((prev) => ({ ...prev, isCollapsed: !prev.isCollapsed }));
        break;
      case 3:
        setL3((prev) => ({ ...prev, isCollapsed: !prev.isCollapsed }));
        break;
      case 4:
        setL4((prev) => ({ ...prev, isCollapsed: !prev.isCollapsed }));
        break;
    }
  }, []);

  const setCollapsed = useCallback((level: 2 | 3 | 4, collapsed: boolean) => {
    switch (level) {
      case 2:
        setL2((prev) => ({ ...prev, isCollapsed: collapsed }));
        break;
      case 3:
        setL3((prev) => ({ ...prev, isCollapsed: collapsed }));
        break;
      case 4:
        setL4((prev) => ({ ...prev, isCollapsed: collapsed }));
        break;
    }
  }, []);

  const isCollapsed = useCallback(
    (level: 2 | 3 | 4): boolean => {
      switch (level) {
        case 2:
          return L2.isCollapsed;
        case 3:
          return L3.isCollapsed;
        case 4:
          return L4.isCollapsed;
      }
    },
    [L2.isCollapsed, L3.isCollapsed, L4.isCollapsed]
  );

  const getSelectedId = useCallback(
    (level: 2 | 3 | 4): string | null => {
      switch (level) {
        case 2:
          return L2.selectedId;
        case 3:
          return L3.selectedId;
        case 4:
          return L4.selectedId;
      }
    },
    [L2.selectedId, L3.selectedId, L4.selectedId]
  );

  const resetAll = useCallback(() => {
    setL1Open(true);
    setL2({ ...initialLevelState });
    setL3({ ...initialLevelState });
    setL4({ ...initialLevelState });
  }, [setL1Open]);

  /**
   * Go back from a level - clears selection and restores adjacent levels
   */
  const goBack = useCallback(
    (fromLevel: 2 | 3 | 4) => {
      switch (fromLevel) {
        case 2:
          setL2((prev) => ({ ...prev, selectedId: null }));
          setL1Open(true);
          break;
        case 3:
          setL3((prev) => ({ ...prev, selectedId: null }));
          setL4((prev) => ({ ...prev, selectedId: null }));
          setL1Open(true);
          setL2((prev) => ({ ...prev, isCollapsed: false }));
          break;
        case 4:
          setL4((prev) => ({ ...prev, selectedId: null }));
          setL2((prev) => ({ ...prev, isCollapsed: false }));
          setL3((prev) => ({ ...prev, isCollapsed: false }));
          break;
      }
    },
    [setL1Open]
  );

  return (
    <NavigationContext.Provider
      value={{
        levels: { L2, L3, L4 },
        selectAtLevel,
        toggleCollapse,
        setCollapsed,
        isCollapsed,
        getSelectedId,
        resetAll,
        goBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}

/**
 * Hook for a specific navigation level
 * Provides convenient access to a single level's state and actions
 */
export function useNavLevel(level: 2 | 3 | 4) {
  const nav = useNavigation();

  return {
    isCollapsed: nav.isCollapsed(level),
    selectedId: nav.getSelectedId(level),
    select: (itemId: string | null) => nav.selectAtLevel(level, itemId),
    toggleCollapse: () => nav.toggleCollapse(level),
    setCollapsed: (collapsed: boolean) => nav.setCollapsed(level, collapsed),
    goBack: () => nav.goBack(level),
  };
}
