"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const LEVEL_NAMES = ["New", "Learning", "Trusted", "Expert"];

const LEVEL_DESCRIPTIONS = [
  "Manual review for all summaries",
  "Quick review with suggestions",
  "Auto-approve normal, review sensitive",
  "Full automation (requires opt-in)",
];

type TrustPreferenceSettingsProps = {
  currentLevel: number;
  preferredLevel: number | null;
  onUpdate: (level: number) => void;
};

export function TrustPreferenceSettings({
  currentLevel,
  preferredLevel,
  onUpdate,
}: TrustPreferenceSettingsProps) {
  const selectedLevel = preferredLevel ?? currentLevel;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-semibold text-base">
          Trust Level Preferences
        </h3>
        <p className="text-muted-foreground text-sm">
          Choose your preferred maximum automation level. You can only select
          levels you've already earned.
        </p>
      </div>

      <RadioGroup
        onValueChange={(value) => onUpdate(Number(value))}
        value={selectedLevel.toString()}
      >
        {[0, 1, 2, 3].map((level) => {
          const isDisabled = level > currentLevel;
          const isSelected = level === selectedLevel;

          return (
            <div
              className={`space-y-2 rounded-lg border p-4 ${
                isDisabled
                  ? "cursor-not-allowed bg-gray-50 opacity-60"
                  : "cursor-pointer hover:bg-gray-50"
              } ${isSelected ? "border-green-600 bg-green-50" : ""}`}
              key={level}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem
                  className="mt-1"
                  disabled={isDisabled}
                  id={`level-${level}`}
                  value={level.toString()}
                />
                <div className="flex-1">
                  <Label
                    className={`font-semibold text-sm ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                    htmlFor={`level-${level}`}
                  >
                    Level {level}: {LEVEL_NAMES[level]}
                    {isDisabled && " (Not yet earned)"}
                  </Label>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {LEVEL_DESCRIPTIONS[level]}
                  </p>

                  {/* Warning for Level 3 */}
                  {level === 3 && !isDisabled && (
                    <Alert className="mt-3 border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 text-sm">
                        Full automation means summaries will be sent to parents
                        without your review. Only enable this when you're
                        confident in the AI's accuracy.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </RadioGroup>

      <div className="rounded-lg bg-blue-50 p-4">
        <p className="text-blue-800 text-sm">
          <strong>Note:</strong> You can always lower your automation level, but
          you'll need to earn higher levels through consistent approvals and low
          suppression rates.
        </p>
      </div>
    </div>
  );
}
