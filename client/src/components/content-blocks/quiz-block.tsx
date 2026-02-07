import { useState, useCallback } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { QuizBlock } from "./types";

interface QuizRendererProps {
  block: QuizBlock;
  /** Called when user answers — bubbles up for scoring/Bilko response */
  onAnswer?: (correct: boolean) => void;
}

export function QuizRenderer({ block, onAnswer }: QuizRendererProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = selected === block.correctIndex;

  const handleSelect = useCallback(
    (index: number) => {
      if (answered) return;
      setSelected(index);
      onAnswer?.(index === block.correctIndex);
    },
    [answered, block.correctIndex, onAnswer],
  );

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{block.question}</h3>
      <div className="space-y-2">
        {block.options.map((option, i) => {
          const isThis = selected === i;
          const isRight = i === block.correctIndex;

          let style = "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer";
          if (answered) {
            if (isRight) {
              style = "border-green-500 bg-green-500/10";
            } else if (isThis) {
              style = "border-red-500 bg-red-500/10";
            } else {
              style = "border-border opacity-40";
            }
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`w-full text-left p-4 rounded-lg border transition-all flex items-center gap-3 ${style}`}
            >
              <span className="flex-1 text-sm">{option.text}</span>
              {answered && isRight && (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              )}
              {answered && isThis && !isRight && (
                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      {answered && block.explanation && (
        <div className={`mt-4 p-3 rounded-lg text-sm leading-relaxed ${
          isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-muted text-muted-foreground"
        }`}>
          {block.explanation}
        </div>
      )}
    </div>
  );
}
