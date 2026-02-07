import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import type { CodeBlock } from "./types";

export function CodeRenderer({ block }: { block: CodeBlock }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [block.code]);

  return (
    <div>
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-xs text-muted-foreground font-mono">
            {block.filename ?? block.language}
          </span>
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {/* Code */}
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm font-mono text-foreground leading-relaxed whitespace-pre">
            {block.code}
          </code>
        </pre>
      </div>
      {block.explanation && (
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {block.explanation}
        </p>
      )}
    </div>
  );
}
