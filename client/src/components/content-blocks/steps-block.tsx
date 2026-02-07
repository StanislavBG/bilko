import { CheckCircle2 } from "lucide-react";
import type { StepsBlock } from "./types";

export function StepsRenderer({ block }: { block: StepsBlock }) {
  return (
    <div>
      {block.title && (
        <h3 className="text-lg font-semibold text-foreground mb-4">{block.title}</h3>
      )}
      <div className="space-y-1">
        {block.steps.map((step, i) => (
          <div key={i} className="flex gap-4">
            {/* Timeline column */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium ${
                  step.complete
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.complete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < block.steps.length - 1 && (
                <div className="w-px flex-1 bg-border min-h-[16px]" />
              )}
            </div>
            {/* Content column */}
            <div className="pb-6 flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-foreground">{step.title}</h4>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
