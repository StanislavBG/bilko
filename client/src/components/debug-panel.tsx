/**
 * Debug Panel — In-app error log with copy and clear.
 *
 * Renders as a left-side sheet triggered by a bug icon button.
 * Shows captured console.error/warn entries with timestamps.
 */

import { Bug, Copy, Trash2, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useDebug, type DebugEntry } from "@/contexts/debug-context";
import { Badge } from "@/components/ui/badge";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function DebugEntryRow({ entry }: { entry: DebugEntry }) {
  return (
    <div
      className={`text-xs font-mono px-2 py-1.5 rounded ${
        entry.level === "error"
          ? "bg-red-500/10 text-red-400"
          : "bg-amber-500/10 text-amber-400"
      }`}
    >
      <span className="text-[10px] text-muted-foreground mr-2">
        {formatTime(entry.timestamp)}
      </span>
      <span className="text-[10px] font-semibold mr-1.5 uppercase">
        {entry.level}
      </span>
      <span className="break-all">{entry.message}</span>
    </div>
  );
}

export function DebugButton() {
  const { entries, unreadCount, markRead, clear, copyToClipboard } = useDebug();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) markRead();
  };

  const handleCopy = async () => {
    await copyToClipboard();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleOpen(true)}
        className="relative"
        title="Debug log"
        data-testid="button-debug"
      >
        <Bug className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "!" : unreadCount}
          </span>
        )}
        <span className="sr-only">Debug log</span>
      </Button>

      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetContent side="left" className="flex flex-col w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Debug Log
              {entries.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {entries.length}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              Captured errors and warnings from the app.
            </SheetDescription>
          </SheetHeader>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={entries.length === 0}
              className="gap-1.5"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy All"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clear}
              disabled={entries.length === 0}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>

          {/* Log entries */}
          <div className="flex-1 overflow-y-auto mt-3 space-y-1">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No errors captured yet.
              </p>
            ) : (
              entries
                .slice()
                .reverse()
                .map((entry) => <DebugEntryRow key={entry.id} entry={entry} />)
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
