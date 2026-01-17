"use client";

import { Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type GenerationStage = "analyzing" | "selecting" | "formatting" | "complete";

const STAGE_INFO: Record<
  GenerationStage,
  { label: string; progress: number; duration: number }
> = {
  analyzing: {
    label: "Analyzing training requirements...",
    progress: 25,
    duration: 3000,
  },
  selecting: {
    label: "Selecting drills and exercises...",
    progress: 60,
    duration: 4000,
  },
  formatting: {
    label: "Formatting session plan...",
    progress: 90,
    duration: 3000,
  },
  complete: { label: "Complete!", progress: 100, duration: 0 },
};

type GenerationProgressProps = {
  onCancel: () => void;
};

export function GenerationProgress({ onCancel }: GenerationProgressProps) {
  const [stage, setStage] = useState<GenerationStage>("analyzing");
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(10);

  useEffect(() => {
    // Smooth progress animation
    const targetProgress = STAGE_INFO[stage].progress;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= targetProgress) {
          return targetProgress;
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    // Stage transitions
    const stages: GenerationStage[] = ["analyzing", "selecting", "formatting"];
    const currentIndex = stages.indexOf(stage);

    if (currentIndex < stages.length - 1) {
      const timer = setTimeout(() => {
        setStage(stages[currentIndex + 1]);
      }, STAGE_INFO[stage].duration);

      return () => clearTimeout(timer);
    }
  }, [stage]);

  useEffect(() => {
    // Countdown timer
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Generating Session Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{STAGE_INFO[stage].label}</span>
            <span className="text-muted-foreground">
              {timeRemaining > 0 && `~${timeRemaining}s remaining`}
            </span>
          </div>
          <Progress className="h-3" value={progress} />
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onCancel} size="sm" variant="outline">
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Generation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
