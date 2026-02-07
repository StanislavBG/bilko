import { AlertTriangle, Info, Lightbulb, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import type { CalloutBlock } from "./types";

const STYLES = {
  tip: { border: "border-blue-500/30", bg: "bg-blue-500/5", icon: Lightbulb, iconColor: "text-blue-500" },
  warning: { border: "border-yellow-500/30", bg: "bg-yellow-500/5", icon: AlertTriangle, iconColor: "text-yellow-500" },
  note: { border: "border-muted-foreground/20", bg: "bg-muted/30", icon: Info, iconColor: "text-muted-foreground" },
  insight: { border: "border-purple-500/30", bg: "bg-purple-500/5", icon: Sparkles, iconColor: "text-purple-500" },
  success: { border: "border-green-500/30", bg: "bg-green-500/5", icon: CheckCircle2, iconColor: "text-green-500" },
  error: { border: "border-red-500/30", bg: "bg-red-500/5", icon: XCircle, iconColor: "text-red-500" },
} as const;

export function CalloutRenderer({ block }: { block: CalloutBlock }) {
  const style = STYLES[block.variant];
  const Icon = style.icon;

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${style.iconColor}`} />
        <div className="flex-1 min-w-0">
          {block.title && (
            <h4 className="font-semibold text-sm text-foreground mb-1">{block.title}</h4>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed">{block.body}</p>
        </div>
      </div>
    </div>
  );
}
