"use client";

import type { ParseResult } from "@pdp/backend/convex/lib/import/parser";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PlayerSelectionStepProps = {
  parsedData: ParseResult;
  confirmedMappings: Record<string, string>;
  selectedRows: Set<number>;
  onSelectionChange: (selected: Set<number>) => void;
  goBack: () => void;
  goNext: () => void;
};

type FilterTab = "all" | "selected" | "unselected";

type SortField =
  | "name"
  | "dob"
  | "ageGroup"
  | "gender"
  | "parentEmail"
  | "team";
type SortDirection = "asc" | "desc";

/** Look up a mapped value from a row using the confirmed mappings */
function getMappedValue(
  row: Record<string, string>,
  targetField: string,
  mappings: Record<string, string>
): string {
  for (const [sourceCol, target] of Object.entries(mappings)) {
    if (target === targetField) {
      return row[sourceCol] ?? "";
    }
  }
  return "";
}

function getSortValue(
  row: Record<string, string>,
  field: SortField,
  mappings: Record<string, string>
): string {
  switch (field) {
    case "name":
      return `${getMappedValue(row, "firstName", mappings)} ${getMappedValue(row, "lastName", mappings)}`.toLowerCase();
    case "dob":
      return getMappedValue(row, "dateOfBirth", mappings);
    case "ageGroup":
      return getMappedValue(row, "ageGroup", mappings).toLowerCase();
    case "gender":
      return getMappedValue(row, "gender", mappings).toLowerCase();
    case "parentEmail":
      return getMappedValue(row, "parentEmail", mappings).toLowerCase();
    case "team":
      return getMappedValue(row, "team", mappings).toLowerCase();
    default:
      return "";
  }
}

function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField | null;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) {
    return (
      <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />
    );
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3" />
  );
}

function PlayerRow({
  row,
  rowIndex,
  isSelected,
  mappings,
  onToggle,
}: {
  row: Record<string, string>;
  rowIndex: number;
  isSelected: boolean;
  mappings: Record<string, string>;
  onToggle: () => void;
}) {
  const firstName = getMappedValue(row, "firstName", mappings);
  const lastName = getMappedValue(row, "lastName", mappings);
  const dob = getMappedValue(row, "dateOfBirth", mappings);
  const gender = getMappedValue(row, "gender", mappings);
  const ageGroup = getMappedValue(row, "ageGroup", mappings);
  const parentEmail = getMappedValue(row, "parentEmail", mappings);
  const team = getMappedValue(row, "team", mappings);

  return (
    <TableRow className={isSelected ? "bg-primary/5" : ""}>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {rowIndex + 1}
      </TableCell>
      <TableCell className="font-medium text-sm">
        {firstName} {lastName}
      </TableCell>
      <TableCell className="text-sm">{dob}</TableCell>
      <TableCell className="text-sm">{ageGroup}</TableCell>
      <TableCell className="text-sm">{gender}</TableCell>
      <TableCell className="max-w-[120px] truncate text-sm">
        {parentEmail}
      </TableCell>
      <TableCell className="text-sm">{team}</TableCell>
    </TableRow>
  );
}

export default function PlayerSelectionStep({
  parsedData,
  confirmedMappings,
  selectedRows,
  onSelectionChange,
  goBack,
  goNext,
}: PlayerSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const totalCount = parsedData.rows.length;
  const selectedCount = selectedRows.size;
  const unselectedCount = totalCount - selectedCount;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort rows
  const filteredIndices = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const indices: number[] = [];

    for (let i = 0; i < parsedData.rows.length; i++) {
      // Tab filter
      if (filterTab === "selected" && !selectedRows.has(i)) {
        continue;
      }
      if (filterTab === "unselected" && selectedRows.has(i)) {
        continue;
      }

      // Search filter
      if (query) {
        const row = parsedData.rows[i];
        const searchableValues = Object.values(row).join(" ").toLowerCase();
        if (!searchableValues.includes(query)) {
          continue;
        }
      }

      indices.push(i);
    }

    // Sort
    if (sortField) {
      indices.sort((a, b) => {
        const valA = getSortValue(
          parsedData.rows[a],
          sortField,
          confirmedMappings
        );
        const valB = getSortValue(
          parsedData.rows[b],
          sortField,
          confirmedMappings
        );
        const cmp = valA.localeCompare(valB);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }

    return indices;
  }, [
    parsedData.rows,
    searchQuery,
    filterTab,
    selectedRows,
    sortField,
    sortDirection,
    confirmedMappings,
  ]);

  const handleSelectAll = () => {
    const next = new Set(selectedRows);
    for (let i = 0; i < totalCount; i++) {
      next.add(i);
    }
    onSelectionChange(next);
  };

  const handleDeselectAll = () => {
    onSelectionChange(new Set());
  };

  const handleToggle = (rowIndex: number) => {
    const next = new Set(selectedRows);
    if (next.has(rowIndex)) {
      next.delete(rowIndex);
    } else {
      next.add(rowIndex);
    }
    onSelectionChange(next);
  };

  const handleToggleAll = () => {
    if (selectedCount === totalCount) {
      handleDeselectAll();
    } else {
      handleSelectAll();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Select Players to Import
            </CardTitle>
            <Badge variant="outline">
              {selectedCount} of {totalCount} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, DOB, team..."
              value={searchQuery}
            />
          </div>

          {/* Filter Tabs + Bulk Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              <Button
                onClick={() => setFilterTab("all")}
                size="sm"
                variant={filterTab === "all" ? "default" : "outline"}
              >
                All ({totalCount})
              </Button>
              <Button
                onClick={() => setFilterTab("selected")}
                size="sm"
                variant={filterTab === "selected" ? "default" : "outline"}
              >
                Selected ({selectedCount})
              </Button>
              <Button
                onClick={() => setFilterTab("unselected")}
                size="sm"
                variant={filterTab === "unselected" ? "default" : "outline"}
              >
                Unselected ({unselectedCount})
              </Button>
            </div>
            <div className="ml-auto flex gap-1">
              <Button onClick={handleSelectAll} size="sm" variant="ghost">
                Select All
              </Button>
              <Button onClick={handleDeselectAll} size="sm" variant="ghost">
                Deselect All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedCount === totalCount}
                      onCheckedChange={handleToggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-xs"
                    onClick={() => handleSort("name")}
                  >
                    Name{" "}
                    <SortIcon
                      field="name"
                      sortDirection={sortDirection}
                      sortField={sortField}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-xs"
                    onClick={() => handleSort("dob")}
                  >
                    DOB{" "}
                    <SortIcon
                      field="dob"
                      sortDirection={sortDirection}
                      sortField={sortField}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-xs"
                    onClick={() => handleSort("ageGroup")}
                  >
                    Age Group{" "}
                    <SortIcon
                      field="ageGroup"
                      sortDirection={sortDirection}
                      sortField={sortField}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-xs"
                    onClick={() => handleSort("gender")}
                  >
                    Gender{" "}
                    <SortIcon
                      field="gender"
                      sortDirection={sortDirection}
                      sortField={sortField}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-xs"
                    onClick={() => handleSort("parentEmail")}
                  >
                    Parent Email{" "}
                    <SortIcon
                      field="parentEmail"
                      sortDirection={sortDirection}
                      sortField={sortField}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-xs"
                    onClick={() => handleSort("team")}
                  >
                    Team{" "}
                    <SortIcon
                      field="team"
                      sortDirection={sortDirection}
                      sortField={sortField}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIndices.map((rowIndex) => (
                  <PlayerRow
                    isSelected={selectedRows.has(rowIndex)}
                    key={`player-${String(rowIndex)}`}
                    mappings={confirmedMappings}
                    onToggle={() => handleToggle(rowIndex)}
                    row={parsedData.rows[rowIndex]}
                    rowIndex={rowIndex}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredIndices.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No players match your search.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button onClick={goBack} variant="outline">
          Back
        </Button>
        <Button disabled={selectedCount === 0} onClick={goNext}>
          Continue ({selectedCount} player{selectedCount !== 1 ? "s" : ""})
        </Button>
      </div>
    </div>
  );
}
