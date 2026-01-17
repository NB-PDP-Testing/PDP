"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  isSearching?: boolean;
  resultsCount?: number;
  placeholder?: string;
};

/**
 * Debounced search bar component for session plans
 * - 300ms debounce to prevent excessive queries
 * - Loading indicator while searching
 * - Clear button (X) when search has text
 * - Results count displayed
 */
export function SearchBar({
  value,
  onChange,
  isSearching = false,
  resultsCount,
  placeholder = "Search session plans...",
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce: update parent value after 300ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync local value if parent value changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pr-20 pl-9"
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          type="text"
          value={localValue}
        />
        <div className="-translate-y-1/2 absolute top-1/2 right-2 flex items-center gap-2">
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {localValue && (
            <Button
              aria-label="Clear search"
              className="h-6 w-6 p-0"
              onClick={handleClear}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {resultsCount !== undefined && localValue && (
        <p className="mt-1 text-muted-foreground text-sm">
          {resultsCount} {resultsCount === 1 ? "result" : "results"} found
        </p>
      )}
    </div>
  );
}
