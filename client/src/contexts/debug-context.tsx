/**
 * Debug Context — Global error capture for in-app debugging.
 *
 * Intercepts console.error, console.warn, window.onerror, and
 * unhandledrejection events to build an in-app error log.
 * The user can view, copy, and clear errors without opening dev tools.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

export interface DebugEntry {
  id: number;
  level: "error" | "warn" | "info";
  message: string;
  timestamp: number;
}

interface DebugContextType {
  entries: DebugEntry[];
  /** Number of entries since last clear/view */
  unreadCount: number;
  /** Mark all entries as read */
  markRead: () => void;
  /** Clear all entries */
  clear: () => void;
  /** Copy all entries to clipboard as text */
  copyToClipboard: () => Promise<void>;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

const MAX_ENTRIES = 200;

export function DebugProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<DebugEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const nextIdRef = useRef(1);
  const originalConsoleError = useRef<typeof console.error>();
  const originalConsoleWarn = useRef<typeof console.warn>();
  const originalConsoleInfo = useRef<typeof console.info>();

  const addEntry = useCallback((level: "error" | "warn" | "info", message: string) => {
    const entry: DebugEntry = {
      id: nextIdRef.current++,
      level,
      message,
      timestamp: Date.now(),
    };
    setEntries((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next;
    });
    setUnreadCount((n) => n + 1);
  }, []);

  // Intercept console.error and console.warn
  useEffect(() => {
    originalConsoleError.current = console.error;
    originalConsoleWarn.current = console.warn;
    originalConsoleInfo.current = console.info;

    const stringify = (a: any) =>
      typeof a === "string" ? a : a instanceof Error ? a.message : JSON.stringify(a);

    console.error = (...args: any[]) => {
      originalConsoleError.current?.apply(console, args);
      addEntry("error", args.map(stringify).join(" "));
    };

    console.warn = (...args: any[]) => {
      originalConsoleWarn.current?.apply(console, args);
      addEntry("warn", args.map(stringify).join(" "));
    };

    console.info = (...args: any[]) => {
      originalConsoleInfo.current?.apply(console, args);
      addEntry("info", args.map(stringify).join(" "));
    };

    return () => {
      if (originalConsoleError.current) console.error = originalConsoleError.current;
      if (originalConsoleWarn.current) console.warn = originalConsoleWarn.current;
      if (originalConsoleInfo.current) console.info = originalConsoleInfo.current;
    };
  }, [addEntry]);

  // Capture unhandled errors and promise rejections
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      addEntry("error", `${event.message} (${event.filename}:${event.lineno})`);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
          ? reason
          : JSON.stringify(reason);
      addEntry("error", `Unhandled rejection: ${msg}`);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [addEntry]);

  const markRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    setUnreadCount(0);
  }, []);

  const copyToClipboard = useCallback(async () => {
    const text = entries
      .map((e) => {
        const time = new Date(e.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        return `[${time}] [${e.level.toUpperCase()}] ${e.message}`;
      })
      .join("\n");
    await navigator.clipboard.writeText(text || "(no errors)");
  }, [entries]);

  return (
    <DebugContext.Provider
      value={{ entries, unreadCount, markRead, clear, copyToClipboard }}
    >
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const ctx = useContext(DebugContext);
  if (ctx === undefined) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return ctx;
}
