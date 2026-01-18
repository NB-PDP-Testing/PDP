"use client";

import {
  Clock,
  Flame,
  Heart,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type FilterPill = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  type:
    | "favorite"
    | "featured"
    | "highlyRated"
    | "ageGroup"
    | "duration"
    | "intensity";
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
    id: "featured",
    label: "Featured",
    icon: <Star className="h-4 w-4" />,
    type: "featured",
  },
  {
    id: "highly-rated",
    label: "Top Rated",
    icon: <TrendingUp className="h-4 w-4" />,
    type: "highlyRated",
  },
  {
    id: "u10",
    label: "U10",
    icon: <Users className="h-4 w-4" />,
    type: "ageGroup",
    value: "U10",
  },
  {
    id: "u12",
    label: "U12",
    icon: <Users className="h-4 w-4" />,
    type: "ageGroup",
    value: "U12",
  },
  {
    id: "u14",
    label: "U14",
    icon: <Users className="h-4 w-4" />,
    type: "ageGroup",
    value: "U14",
  },
  {
    id: "u16",
    label: "U16",
    icon: <Users className="h-4 w-4" />,
    type: "ageGroup",
    value: "U16",
  },
  {
    id: "45min",
    label: "45 min",
    icon: <Clock className="h-4 w-4" />,
    type: "duration",
    value: "45",
  },
  {
    id: "60min",
    label: "60 min",
    icon: <Clock className="h-4 w-4" />,
    type: "duration",
    value: "60",
  },
  {
    id: "90min",
    label: "90 min",
    icon: <Clock className="h-4 w-4" />,
    type: "duration",
    value: "90",
  },
  {
    id: "low-intensity",
    label: "Low",
    icon: <Sparkles className="h-4 w-4" />,
    type: "intensity",
    value: "low",
  },
  {
    id: "medium-intensity",
    label: "Medium",
    icon: <Zap className="h-4 w-4" />,
    type: "intensity",
    value: "medium",
  },
  {
    id: "high-intensity",
    label: "High",
    icon: <Flame className="h-4 w-4" />,
    type: "intensity",
    value: "high",
  },
];

type FilterPillsProps = {
  favoriteOnly: boolean;
  featuredOnly: boolean;
  highlyRatedOnly: boolean;
  ageGroups: string[];
  intensities: Array<"low" | "medium" | "high">;
  selectedDuration?: number;
  onToggleFavorite: () => void;
  onToggleFeatured: () => void;
  onToggleHighlyRated: () => void;
  onToggleAgeGroup: (ageGroup: string) => void;
  onToggleIntensity: (intensity: "low" | "medium" | "high") => void;
  onToggleDuration: (duration: number) => void;
};

export function FilterPills({
  favoriteOnly,
  featuredOnly,
  highlyRatedOnly,
  ageGroups,
  intensities,
  selectedDuration,
  onToggleFavorite,
  onToggleFeatured,
  onToggleHighlyRated,
  onToggleAgeGroup,
  onToggleIntensity,
  onToggleDuration,
}: FilterPillsProps) {
  const isPillActive = (pill: FilterPill): boolean => {
    if (pill.type === "favorite") {
      return favoriteOnly;
    }
    if (pill.type === "featured") {
      return featuredOnly;
    }
    if (pill.type === "highlyRated") {
      return highlyRatedOnly;
    }
    if (pill.type === "ageGroup" && pill.value) {
      return ageGroups.includes(pill.value);
    }
    if (
      pill.type === "intensity" &&
      pill.value &&
      (pill.value === "low" || pill.value === "medium" || pill.value === "high")
    ) {
      return intensities.includes(pill.value);
    }
    if (pill.type === "duration" && pill.value) {
      return selectedDuration === Number.parseInt(pill.value, 10);
    }
    return false;
  };

  const handlePillClick = (pill: FilterPill) => {
    if (pill.type === "favorite") {
      onToggleFavorite();
    } else if (pill.type === "featured") {
      onToggleFeatured();
    } else if (pill.type === "highlyRated") {
      onToggleHighlyRated();
    } else if (pill.type === "ageGroup" && pill.value) {
      onToggleAgeGroup(pill.value);
    } else if (
      pill.type === "intensity" &&
      pill.value &&
      (pill.value === "low" || pill.value === "medium" || pill.value === "high")
    ) {
      onToggleIntensity(pill.value);
    } else if (pill.type === "duration" && pill.value) {
      onToggleDuration(Number.parseInt(pill.value, 10));
    }
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex gap-2">
        {FILTER_PILLS.map((pill) => {
          const isActive = isPillActive(pill);
          return (
            <Button
              className={`flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-sm transition-all sm:h-12 sm:gap-2 sm:px-4 ${
                isActive
                  ? "border-[#667eea] bg-[#667eea] text-white shadow-md hover:bg-[#764ba2]"
                  : "border-gray-300 bg-white text-gray-700 hover:border-[#667eea] hover:text-[#667eea]"
              }`}
              key={pill.id}
              onClick={() => handlePillClick(pill)}
              size="sm"
              variant="outline"
            >
              {pill.icon}
              <span>{pill.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
