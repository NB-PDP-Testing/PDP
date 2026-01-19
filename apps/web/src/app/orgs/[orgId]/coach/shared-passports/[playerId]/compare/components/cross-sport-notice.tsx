"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type CrossSportNoticeProps = {
  localSport: string;
  sharedSport: string;
};

// Sport display names for user-friendly labels
const SPORT_DISPLAY_NAMES: Record<string, string> = {
  gaa_football: "GAA Football",
  gaa_hurling: "GAA Hurling",
  soccer: "Soccer",
  rugby: "Rugby",
  basketball: "Basketball",
  hockey: "Hockey",
};

/**
 * Cross-Sport Notice
 *
 * Displays a notice when comparing passport data across different sports.
 * Explains which skills are universal (comparable) and which are sport-specific.
 */
export function CrossSportNotice({
  localSport,
  sharedSport,
}: CrossSportNoticeProps) {
  const localSportName = SPORT_DISPLAY_NAMES[localSport] || localSport;
  const sharedSportName = SPORT_DISPLAY_NAMES[sharedSport] || sharedSport;

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-700" />
      <AlertTitle className="text-amber-800">Cross-Sport Comparison</AlertTitle>
      <AlertDescription className="text-amber-700">
        <p className="mb-2">
          Comparing <strong>{localSportName}</strong> (your assessment) with{" "}
          <strong>{sharedSportName}</strong> (shared data).
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-amber-100 p-3">
            <p className="font-medium text-amber-900 text-sm">
              Universal Skills (Comparable)
            </p>
            <ul className="mt-1 list-inside list-disc text-amber-800 text-sm">
              <li>Physical: Speed, Endurance, Strength, Agility</li>
              <li>Mental: Focus, Resilience, Coachability</li>
              <li>Attendance patterns</li>
            </ul>
          </div>
          <div className="rounded-md bg-amber-100 p-3">
            <p className="font-medium text-amber-900 text-sm">
              Sport-Specific (For Context Only)
            </p>
            <ul className="mt-1 list-inside list-disc text-amber-800 text-sm">
              <li>Technical skills differ by sport</li>
              <li>Tactical awareness is sport-dependent</li>
              <li>Positions may not map directly</li>
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
