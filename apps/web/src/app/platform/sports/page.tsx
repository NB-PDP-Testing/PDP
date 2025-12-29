"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle,
  Plus,
  Settings,
  Trash2,
  Trophy,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_AGE_GROUPS = [
  "u6",
  "u7",
  "u8",
  "u9",
  "u10",
  "u11",
  "u12",
  "u13",
  "u14",
  "u15",
  "u16",
  "u17",
  "u18",
  "minor",
  "adult",
  "senior",
];

export default function PlatformSportsManagementPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string>("");

  // Sport creation/edit state
  const [sportCode, setSportCode] = useState("");
  const [sportName, setSportName] = useState("");
  const [sportDescription, setSportDescription] = useState("");

  // Age group configuration state
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("");
  const [minAge, setMinAge] = useState<number | undefined>(undefined);
  const [maxAge, setMaxAge] = useState<number | undefined>(undefined);
  const [ageGroupDescription, setAgeGroupDescription] = useState("");

  // Eligibility rules state
  const [fromAgeGroup, setFromAgeGroup] = useState("");
  const [toAgeGroup, setToAgeGroup] = useState("");
  const [isAllowed, setIsAllowed] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);

  // Queries
  const sports = useQuery(api.models.sports.getAll);
  const sportConfig = useQuery(
    api.models.sportAgeGroupConfig.getSportAgeGroupConfig,
    selectedSport ? { sportCode: selectedSport } : "skip"
  );
  const eligibilityRules = useQuery(
    api.models.sportAgeGroupConfig.getSportEligibilityRules,
    selectedSport ? { sportCode: selectedSport } : "skip"
  );

  // Mutations
  const createSport = useMutation(api.models.sports.create);
  const updateSport = useMutation(api.models.sports.update);
  const deleteSport = useMutation(api.models.sports.remove);
  const upsertAgeGroupConfig = useMutation(
    api.models.sportAgeGroupConfig.upsertSportAgeGroupConfig
  );
  const upsertEligibilityRule = useMutation(
    api.models.sportAgeGroupConfig.upsertSportEligibilityRule
  );

  // Handle create sport
  const handleCreateSport = async () => {
    if (!(sportCode.trim() && sportName.trim())) {
      toast.error("Please provide sport code and name");
      return;
    }

    try {
      await createSport({
        code: sportCode.trim().toLowerCase(),
        name: sportName.trim(),
        description: sportDescription.trim() || undefined,
      });

      toast.success(`${sportName} has been created successfully`);

      // Reset form
      setSportCode("");
      setSportName("");
      setSportDescription("");
      setCreateDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  };

  // Handle delete sport
  const handleDeleteSport = async (code: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${name}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteSport({ code });

      toast.success(`${name} has been deleted successfully`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  };

  // Handle configure age group
  const handleConfigureAgeGroup = async () => {
    if (!(selectedSport && selectedAgeGroup)) {
      toast.error("Please select a sport and age group");
      return;
    }

    try {
      await upsertAgeGroupConfig({
        sportCode: selectedSport,
        ageGroupCode: selectedAgeGroup,
        minAge,
        maxAge,
        description: ageGroupDescription.trim() || undefined,
      });

      toast.success(
        `${selectedAgeGroup} configuration updated for ${selectedSport}`
      );

      // Reset form
      setSelectedAgeGroup("");
      setMinAge(undefined);
      setMaxAge(undefined);
      setAgeGroupDescription("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  };

  // Handle create eligibility rule
  const handleCreateEligibilityRule = async () => {
    if (!(selectedSport && fromAgeGroup && toAgeGroup)) {
      toast.error("Please select sport and age groups");
      return;
    }

    try {
      await upsertEligibilityRule({
        sportCode: selectedSport,
        fromAgeGroupCode: fromAgeGroup,
        toAgeGroupCode: toAgeGroup,
        isAllowed,
        requiresApproval,
      });

      toast.success(`Rule created: ${fromAgeGroup} → ${toAgeGroup}`);

      // Reset form
      setFromAgeGroup("");
      setToAgeGroup("");
      setIsAllowed(true);
      setRequiresApproval(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                Platform Sports Management
              </h1>
              <p className="mt-2 text-muted-foreground">
                Configure sports and age group eligibility rules for all
                organizations
              </p>
            </div>

            <Dialog onOpenChange={setCreateDialogOpen} open={createDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Sport
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Sport</DialogTitle>
                  <DialogDescription>
                    Add a new sport to the platform that organizations can use
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="sportCode">Sport Code *</Label>
                    <Input
                      id="sportCode"
                      onChange={(e) => setSportCode(e.target.value)}
                      placeholder="e.g., gaa-football, swimming"
                      value={sportCode}
                    />
                    <p className="text-muted-foreground text-xs">
                      Lowercase, hyphen-separated identifier
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sportName">Sport Name *</Label>
                    <Input
                      id="sportName"
                      onChange={(e) => setSportName(e.target.value)}
                      placeholder="e.g., GAA Football, Swimming"
                      value={sportName}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sportDescription">Description</Label>
                    <Textarea
                      id="sportDescription"
                      onChange={(e) => setSportDescription(e.target.value)}
                      placeholder="Brief description of the sport..."
                      rows={3}
                      value={sportDescription}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={() => setCreateDialogOpen(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSport}>Create Sport</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs className="space-y-6" defaultValue="sports">
            <TabsList>
              <TabsTrigger value="sports">
                <Trophy className="mr-2 h-4 w-4" />
                Sports
              </TabsTrigger>
              <TabsTrigger disabled={!selectedSport} value="configuration">
                <Settings className="mr-2 h-4 w-4" />
                Configuration
              </TabsTrigger>
            </TabsList>

            {/* Sports List */}
            <TabsContent value="sports">
              <Card>
                <CardHeader>
                  <CardTitle>All Sports</CardTitle>
                  <CardDescription>
                    Manage sports available to organizations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!sports || sports.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Trophy className="mx-auto mb-4 h-12 w-12 opacity-20" />
                      <p>No sports created yet</p>
                      <p className="mt-2 text-sm">
                        Create a sport to get started
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sports.map((sport) => (
                          <TableRow key={sport.code}>
                            <TableCell className="font-mono text-sm">
                              {sport.code}
                            </TableCell>
                            <TableCell className="font-medium">
                              {sport.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {sport.description || "—"}
                            </TableCell>
                            <TableCell className="space-x-2 text-right">
                              <Button
                                onClick={() => {
                                  setSelectedSport(sport.code);
                                  // Switch to configuration tab
                                  const tabsList = document.querySelector(
                                    '[value="configuration"]'
                                  ) as HTMLButtonElement;
                                  tabsList?.click();
                                }}
                                size="sm"
                                variant="outline"
                              >
                                <Settings className="mr-1 h-4 w-4" />
                                Configure
                              </Button>
                              <Button
                                onClick={() =>
                                  handleDeleteSport(sport.code, sport.name)
                                }
                                size="sm"
                                variant="destructive"
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sport Configuration */}
            <TabsContent value="configuration">
              {selectedSport && (
                <div className="space-y-6">
                  {/* Sport Selector */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Configure Sport</CardTitle>
                      <CardDescription>
                        Select a sport to configure its age groups and
                        eligibility rules
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label>Selected Sport</Label>
                        <Select
                          onValueChange={setSelectedSport}
                          value={selectedSport}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sports?.map((sport) => (
                              <SelectItem key={sport.code} value={sport.code}>
                                {sport.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Age Group Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Age Group Configuration</CardTitle>
                      <CardDescription>
                        Customize age ranges for each age group in this sport
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Existing configurations */}
                      {sportConfig && sportConfig.length > 0 && (
                        <div>
                          <h3 className="mb-3 font-medium text-sm">
                            Current Configuration
                          </h3>
                          <div className="space-y-2">
                            {sportConfig.map((config) => (
                              <div
                                className="flex items-center justify-between rounded-lg border p-3"
                                key={config._id}
                              >
                                <div>
                                  <Badge className="mb-1" variant="outline">
                                    {config.ageGroupCode.toUpperCase()}
                                  </Badge>
                                  <p className="text-muted-foreground text-sm">
                                    Ages: {config.minAge ?? "—"} -{" "}
                                    {config.maxAge ?? "—"}
                                  </p>
                                  {config.description && (
                                    <p className="mt-1 text-muted-foreground text-xs">
                                      {config.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add new configuration */}
                      <div className="border-t pt-6">
                        <h3 className="mb-3 font-medium text-sm">
                          Add/Update Age Group
                        </h3>
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label>Age Group</Label>
                            <Select
                              onValueChange={setSelectedAgeGroup}
                              value={selectedAgeGroup}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select age group..." />
                              </SelectTrigger>
                              <SelectContent>
                                {DEFAULT_AGE_GROUPS.map((ag) => (
                                  <SelectItem key={ag} value={ag}>
                                    {ag.toUpperCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Min Age</Label>
                              <Input
                                onChange={(e) =>
                                  setMinAge(
                                    e.target.value
                                      ? Number.parseInt(e.target.value)
                                      : undefined
                                  )
                                }
                                placeholder="e.g., 6"
                                type="number"
                                value={minAge ?? ""}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Max Age</Label>
                              <Input
                                onChange={(e) =>
                                  setMaxAge(
                                    e.target.value
                                      ? Number.parseInt(e.target.value)
                                      : undefined
                                  )
                                }
                                placeholder="e.g., 7"
                                type="number"
                                value={maxAge ?? ""}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Description (optional)</Label>
                            <Textarea
                              onChange={(e) =>
                                setAgeGroupDescription(e.target.value)
                              }
                              placeholder="Special notes about this age group..."
                              rows={2}
                              value={ageGroupDescription}
                            />
                          </div>

                          <Button onClick={handleConfigureAgeGroup}>
                            Save Age Group Configuration
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Eligibility Rules */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Eligibility Rules</CardTitle>
                      <CardDescription>
                        Define which age groups players can "play up" or "play
                        down" to
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Existing rules */}
                      {eligibilityRules && eligibilityRules.length > 0 && (
                        <div>
                          <h3 className="mb-3 font-medium text-sm">
                            Current Rules
                          </h3>
                          <div className="space-y-2">
                            {eligibilityRules.map((rule) => (
                              <div
                                className="flex items-center justify-between rounded-lg border p-3"
                                key={rule._id}
                              >
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline">
                                    {rule.fromAgeGroupCode.toUpperCase()}
                                  </Badge>
                                  <span className="text-muted-foreground">
                                    →
                                  </span>
                                  <Badge variant="outline">
                                    {rule.toAgeGroupCode.toUpperCase()}
                                  </Badge>
                                  {rule.isAllowed ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  )}
                                  {rule.requiresApproval && (
                                    <Badge variant="secondary">
                                      Requires Approval
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add new rule */}
                      <div className="border-t pt-6">
                        <h3 className="mb-3 font-medium text-sm">
                          Create Eligibility Rule
                        </h3>
                        <div className="grid gap-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Player Age Group</Label>
                              <Select
                                onValueChange={setFromAgeGroup}
                                value={fromAgeGroup}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {DEFAULT_AGE_GROUPS.map((ag) => (
                                    <SelectItem key={ag} value={ag}>
                                      {ag.toUpperCase()}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Team Age Group</Label>
                              <Select
                                onValueChange={setToAgeGroup}
                                value={toAgeGroup}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {DEFAULT_AGE_GROUPS.map((ag) => (
                                    <SelectItem key={ag} value={ag}>
                                      {ag.toUpperCase()}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isAllowed}
                                id="isAllowed"
                                onCheckedChange={(checked) =>
                                  setIsAllowed(checked as boolean)
                                }
                              />
                              <Label
                                className="cursor-pointer"
                                htmlFor="isAllowed"
                              >
                                Allow this combination
                              </Label>
                            </div>

                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={requiresApproval}
                                id="requiresApproval"
                                onCheckedChange={(checked) =>
                                  setRequiresApproval(checked as boolean)
                                }
                              />
                              <Label
                                className="cursor-pointer"
                                htmlFor="requiresApproval"
                              >
                                Requires admin approval (override)
                              </Label>
                            </div>
                          </div>

                          <Button onClick={handleCreateEligibilityRule}>
                            Create Eligibility Rule
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
