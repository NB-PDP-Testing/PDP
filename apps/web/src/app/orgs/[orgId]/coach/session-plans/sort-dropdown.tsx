"use client";

import { ArrowDownAZ, Clock, Star, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption =
  | "mostUsed"
  | "highestRated"
  | "recent"
  | "duration"
  | "alphabetical";

type SortDropdownProps = {
  value: SortOption;
  onChange: (value: SortOption) => void;
};

const sortOptions = [
  {
    value: "mostUsed" as const,
    label: "Most Used",
    icon: TrendingUp,
  },
  {
    value: "highestRated" as const,
    label: "Highest Rated",
    icon: Star,
  },
  {
    value: "recent" as const,
    label: "Recently Created",
    icon: Clock,
  },
  {
    value: "duration" as const,
    label: "Duration",
    icon: Clock,
  },
  {
    value: "alphabetical" as const,
    label: "A-Z",
    icon: ArrowDownAZ,
  },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const selectedOption = sortOptions.find((opt) => opt.value === value);

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">Sort by:</span>
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger className="w-fit" size="sm">
          <SelectValue>
            {selectedOption && (
              <div className="flex items-center gap-2">
                <selectedOption.icon className="h-4 w-4" />
                <span>{selectedOption.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
