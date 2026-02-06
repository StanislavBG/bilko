/**
 * Learning Mode Selector - Interactive card-based learning mode picker
 */

import {
  Play,
  Trophy,
  Sparkles,
  Compass,
  MessageCircle,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LEARNING_MODES, type LearningModeId } from "@/lib/workflow";

// Map icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Play,
  Trophy,
  Sparkles,
  Compass,
  MessageCircle,
  Zap,
};

interface LearningModeSelectorProps {
  onSelect: (modeId: LearningModeId) => void;
  selectedMode?: LearningModeId | null;
}

export function LearningModeSelector({
  onSelect,
  selectedMode,
}: LearningModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
      {LEARNING_MODES.map((mode) => {
        const IconComponent = iconMap[mode.icon];
        const isSelected = selectedMode === mode.id;

        return (
          <Card
            key={mode.id}
            className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
              isSelected
                ? "ring-2 ring-primary bg-primary/5"
                : "hover:bg-muted/50"
            }`}
            onClick={() => onSelect(mode.id)}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {IconComponent && <IconComponent className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="font-semibold">{mode.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {mode.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
