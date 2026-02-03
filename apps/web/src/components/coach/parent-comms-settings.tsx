"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";

type ToneOption = "warm" | "professional" | "brief";

const TONE_EXAMPLES: Record<ToneOption, string> = {
  warm: "Great news! Emma's tackling skills have really improved from 3/5 to 4/5. She's showing fantastic progress and we're so proud of her development!",
  professional:
    "Emma's tackling rating has improved from 3/5 to 4/5. This demonstrates consistent progress in defensive fundamentals.",
  brief: "Emma: Tackling 3/5 → 4/5. Good progress.",
};

const TONE_LABELS: Record<ToneOption, string> = {
  warm: "Warm",
  professional: "Professional",
  brief: "Brief",
};

const TONE_DESCRIPTIONS: Record<ToneOption, string> = {
  warm: "Friendly, encouraging, and enthusiastic. Great for building parent relationships.",
  professional:
    "Clear, objective, and focused. Ideal for formal communications.",
  brief:
    "Concise and direct. Perfect for busy parents who want key updates only.",
};

type ParentCommsSettingsProps = {
  organizationId: string;
};

export function ParentCommsSettings({
  organizationId,
}: ParentCommsSettingsProps) {
  const user = useCurrentUser();
  const [selectedTone, setSelectedTone] = useState<ToneOption>("warm");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch coach preferences
  const preferences = useQuery(
    api.models.coaches.getCoachPreferences,
    user?._id && organizationId
      ? {
          coachId: user._id,
          organizationId,
        }
      : "skip"
  );

  // Update mutation
  const updatePreferences = useMutation(
    api.models.coaches.updateCoachPreferences
  );

  // Set selected tone from loaded preferences
  if (
    preferences &&
    !isSubmitting &&
    selectedTone !== preferences.parentSummaryTone
  ) {
    setSelectedTone(preferences.parentSummaryTone || "warm");
  }

  const handleToneChange = (tone: string) => {
    setSelectedTone(tone as ToneOption);
  };

  const handleSave = async () => {
    if (!(user?._id && organizationId)) {
      toast.error("Missing user or organization information");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePreferences({
        coachId: user._id,
        organizationId,
        parentSummaryTone: selectedTone,
      });
      toast.success("Parent communication preferences saved successfully");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (preferences === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tone Selection */}
      <div className="space-y-2">
        <Label htmlFor="tone-select">Parent Summary Tone</Label>
        <Select onValueChange={handleToneChange} value={selectedTone}>
          <SelectTrigger id="tone-select">
            <SelectValue placeholder="Select a tone" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TONE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground text-xs">
                    {TONE_DESCRIPTIONS[value as ToneOption]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">
          Choose how AI-generated summaries will be written for parents.
        </p>
      </div>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>
            Example of how a parent summary will look with the{" "}
            {TONE_LABELS[selectedTone].toLowerCase()} tone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm leading-relaxed">
              {TONE_EXAMPLES[selectedTone]}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button disabled={isSubmitting} onClick={handleSave}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
