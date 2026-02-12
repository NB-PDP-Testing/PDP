"use client";

import { BarChart3, Info } from "lucide-react";
import type { BenchmarkSettings } from "@/components/import/import-wizard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

type BenchmarkConfigStepProps = {
  settings: BenchmarkSettings;
  onSettingsChange: (settings: BenchmarkSettings) => void;
  goBack: () => void;
  goNext: () => void;
};

const STRATEGIES = [
  {
    value: "blank" as const,
    label: "Blank (All 1s)",
    description:
      "All skills start at minimum rating. Players build from scratch.",
    preview: [1, 1, 1, 1, 1],
  },
  {
    value: "middle" as const,
    label: "Middle (All 3s)",
    description:
      "All skills set to mid-range. Good baseline for mixed ability groups.",
    preview: [3, 3, 3, 3, 3],
  },
  {
    value: "age-appropriate" as const,
    label: "Age-Appropriate (Recommended)",
    description:
      "Skills set based on typical development for each age group. U8s get lower ratings than U14s.",
    preview: [2, 3, 2, 3, 2],
  },
  {
    value: "ngb-benchmarks" as const,
    label: "NGB Standards",
    description:
      "Use National Governing Body benchmarks for the selected sport.",
    preview: [3, 4, 2, 3, 4],
  },
  {
    value: "custom" as const,
    label: "Custom Template",
    description:
      "Use a custom benchmark template defined by your organization.",
    preview: [2, 4, 3, 5, 1],
  },
];

function RatingPreview({ ratings }: { ratings: number[] }) {
  const skillNames = ["Skill A", "Skill B", "Skill C", "Skill D", "Skill E"];
  return (
    <div className="mt-3 grid grid-cols-5 gap-1">
      {ratings.map((rating, idx) => (
        <div className="text-center" key={skillNames[idx]}>
          <div
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-full font-medium text-sm text-white"
            style={{
              backgroundColor: `hsl(${(rating / 5) * 120}, 60%, 45%)`,
            }}
          >
            {rating}
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            {skillNames[idx]}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function BenchmarkConfigStep({
  settings,
  onSettingsChange,
  goBack,
  goNext,
}: BenchmarkConfigStepProps) {
  const selectedStrategy = STRATEGIES.find(
    (s) => s.value === settings.strategy
  );

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle className="text-lg">Benchmark Configuration</CardTitle>
            </div>
            <Switch
              checked={settings.applyBenchmarks}
              onCheckedChange={(checked) =>
                onSettingsChange({ ...settings, applyBenchmarks: checked })
              }
            />
          </div>
          <CardDescription>
            Initialize skill ratings during import so coaches can start tracking
            development immediately.
          </CardDescription>
        </CardHeader>
      </Card>

      {settings.applyBenchmarks && (
        <>
          {/* Strategy Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Rating Strategy</CardTitle>
              <CardDescription>
                Choose how initial skill ratings are determined for imported
                players.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                onValueChange={(value) =>
                  onSettingsChange({
                    ...settings,
                    strategy: value as BenchmarkSettings["strategy"],
                  })
                }
                value={settings.strategy}
              >
                <div className="space-y-3">
                  {STRATEGIES.map((strategy) => (
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        settings.strategy === strategy.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent/50"
                      }`}
                      htmlFor={`strategy-${strategy.value}`}
                      key={strategy.value}
                    >
                      <RadioGroupItem
                        className="mt-0.5"
                        id={`strategy-${strategy.value}`}
                        value={strategy.value}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{strategy.label}</p>
                        <p className="text-muted-foreground text-xs">
                          {strategy.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Preview */}
          {selectedStrategy && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Rating Preview</CardTitle>
                <CardDescription>
                  Sample skill ratings for a typical player using the{" "}
                  <span className="font-medium">{selectedStrategy.label}</span>{" "}
                  strategy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RatingPreview ratings={selectedStrategy.preview} />
                <div className="mt-4 flex items-start gap-2 rounded-md bg-muted p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-muted-foreground text-xs">
                    These are sample values. Actual ratings will vary based on
                    sport, age group, and available benchmark data.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom template selector (placeholder for future) */}
          {settings.strategy === "custom" && (
            <Card>
              <CardContent className="p-4">
                <Label className="text-sm">Custom Template</Label>
                <p className="mt-1 text-muted-foreground text-xs">
                  Custom benchmark templates are coming in a future update. The
                  age-appropriate strategy will be used as a fallback.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button onClick={goBack} variant="outline">
          Back
        </Button>
        <Button onClick={goNext}>Continue to Review</Button>
      </div>
    </div>
  );
}
