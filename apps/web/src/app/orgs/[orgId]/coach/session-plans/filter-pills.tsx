"use client";

import { Clock, Heart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type FilterPill = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  type: "favorite" | "ageGroup" | "duration" | "intensity";
  value?: string; // For ageGroup, duration, intensity filters
};

const FILTER_PILLS: FilterPill[] = [
  {
    id: "favorites",
    label: "Favorites",
    icon: <Heart className="h-4 w-4" />,
    type: "favorite",
  },
  {
    id: "u12",
    label: "U12",
    type: "ageGroup",
    value: "U12",
  },
  {
    id: "u14",
    label: "U14",
    type: "ageGroup",
    value: "U14",
  },
  {
    id: "60min",
    label: "60 min",
    icon: <Clock className="h-4 w-4" />,
    type: "duration",
    value: "60",
  },
  {
    id: "high-intensity",
    label: "High Intensity",
    icon: <Zap className="h-4 w-4" />,
    type: "intensity",
    value: "high",
  },
];

type FilterPillsProps = {
  favoriteOnly: boolean;
  ageGroups: string[];
  intensities: Array<"low" | "medium" | "high">;
  onToggleFavorite: () => void;
  onToggleAgeGroup: (ageGroup: string) => void;
  onToggleIntensity: (intensity: "low" | "medium" | "high") => void;
};

export function FilterPills({
  favoriteOnly,
  ageGroups,
  intensities,
  onToggleFavorite,
  onToggleAgeGroup,
  onToggleIntensity,
}: FilterPillsProps) {
  const isPillActive = (pill: FilterPill): boolean => {
    if (pill.type === "favorite") {
      return favoriteOnly;
    }
    if (pill.type === "ageGroup" && pill.value) {
      return ageGroups.includes(pill.value);
    }
    // Type guard to ensure value is the correct union type
    if (
      pill.type === "intensity" &&
      pill.value &&
      (pill.value === "low" || pill.value === "medium" || pill.value === "high")
    ) {
      return intensities.includes(pill.value);
    }
    // Duration filter not yet implemented in filter state, always inactive for now
    return false;
  };

  const handlePillClick = (pill: FilterPill) => {
    if (pill.type === "favorite") {
      onToggleFavorite();
    } else if (pill.type === "ageGroup" && pill.value) {
      onToggleAgeGroup(pill.value);
    } else if (
      pill.type === "intensity" &&
      pill.value &&
      (pill.value === "low" || pill.value === "medium" || pill.value === "high")
    ) {
      // Type guard to ensure value is the correct union type
      onToggleIntensity(pill.value);
    }
    // Duration filter not yet implemented
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {FILTER_PILLS.map((pill) => {
        const isActive = isPillActive(pill);
        return (
          <Button
            className="flex h-12 min-w-fit items-center gap-2 whitespace-nowrap px-4"
            key={pill.id}
            onClick={() => handlePillClick(pill)}
            size="sm"
            variant={isActive ? "default" : "outline"}
          >
            {pill.icon}
            <span>{pill.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
