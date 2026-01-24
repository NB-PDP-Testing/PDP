"use client";

import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type TrustLevelSliderProps = {
  currentLevel: number;
  preferredLevel: number | null;
  earnedLevel: number;
  onLevelChange: (level: number) => void;
  progressToNext: {
    percentage: number;
    threshold: number;
    currentCount: number;
  };
};

export function TrustLevelSlider({
  currentLevel,
  preferredLevel,
  earnedLevel,
  onLevelChange,
  progressToNext,
}: TrustLevelSliderProps) {
  const selectedLevel = preferredLevel ?? currentLevel;
  const levelNames = ["Manual", "Learning", "Trusted", "Expert"];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          {[0, 1, 2, 3].map((level) => (
            <div
              className={cn("text-center", level > earnedLevel && "opacity-40")}
              key={level}
            >
              <div className="font-medium">{levelNames[level]}</div>
              <div className="text-muted-foreground text-xs">Lvl {level}</div>
            </div>
          ))}
        </div>
        <Slider
          className="py-4"
          max={earnedLevel}
          min={0}
          onValueChange={([level]) => onLevelChange(level)}
          step={1}
          value={[selectedLevel]}
        />
        <p className="text-muted-foreground text-sm">
          Your Setting: Level {selectedLevel} - {levelNames[selectedLevel]}
        </p>
      </div>
      {earnedLevel < 3 && (
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-sm">
                Progress to {levelNames[earnedLevel + 1]}
              </span>
              <span className="text-muted-foreground text-xs">
                {progressToNext.currentCount} / {progressToNext.threshold}
              </span>
            </div>
            <Progress className="h-2" value={progressToNext.percentage} />
          </div>
          <div className="text-muted-foreground text-xs">
            {progressToNext.percentage >= 80 ? (
              <span className="font-medium text-green-600">
                Almost there! Keep approving quality summaries.
              </span>
            ) : (
              <span>
                {progressToNext.threshold - progressToNext.currentCount} more
                approvals needed
              </span>
            )}
          </div>
        </div>
      )}
      {earnedLevel === 3 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-green-700 text-sm">🎉 Maximum level reached!</p>
        </div>
      )}
    </div>
  );
}
