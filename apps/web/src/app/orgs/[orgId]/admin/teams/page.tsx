"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  MapPin,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface TeamFormData {
  name: string;
  sport: string;
  ageGroup: string;
  gender: "Boys" | "Girls" | "Mixed" | "";
  season: string;
  description: string;
  trainingSchedule: string;
  homeVenue: string;
  isActive: boolean;
}

const defaultFormData: TeamFormData = {
  name: "",
  sport: "",
  ageGroup: "",
  gender: "",
  season: new Date().getFullYear().toString(),
  description: "",
  trainingSchedule: "",
  homeVenue: "",
  isActive: true,
};

const SPORTS = [
  "GAA Football",
  "Hurling",
  "Camogie",
  "Ladies Football",
  "Soccer",
  "Rugby",
];

const AGE_GROUPS = [
  "U6",
  "U8",
  "U10",
  "U12",
  "U14",
  "U16",
  "U18",
  "Minor",
  "Adult",
  "Senior",
];

export default function ManageTeamsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  // Get teams from backend (uses Better Auth component adapter)
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Get players from our custom table
  const players = useQuery(api.models.players.getPlayersByOrganization, {
    organizationId: orgId,
  });

  // Mutations
  const createTeamMutation = useMutation(api.models.teams.createTeam);
  const updateTeamMutation = useMutation(api.models.teams.updateTeam);
  const deleteTeamMutation = useMutation(api.models.teams.deleteTeam);

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [formData, setFormData] = useState<TeamFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("all");

  const isLoading = teams === undefined || players === undefined;

  // Get player count for a team
  const getPlayerCount = (teamId: string) =>
    players?.filter((p: any) => p.teamId === teamId).length || 0;

  // Filter teams
  const filteredTeams = teams?.filter((team: any) => {
    if (sportFilter !== "all" && team.sport !== sportFilter) {
      return false;
    }
    if (ageGroupFilter !== "all" && team.ageGroup !== ageGroupFilter) {
      return false;
    }
    if (!searchTerm) return true;
    const searchable = [team.name, team.sport, team.ageGroup, team.homeVenue]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(searchTerm.toLowerCase());
  });

  // Get unique values for filters
  const uniqueSports = [
    ...new Set(teams?.map((t: any) => t.sport).filter(Boolean)),
  ] as string[];
  const uniqueAgeGroups = [
    ...new Set(teams?.map((t: any) => t.ageGroup).filter(Boolean)),
  ] as string[];

  const toggleExpanded = (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  const openCreateDialog = () => {
    setEditingTeamId(null);
    setFormData(defaultFormData);
    setFormDialogOpen(true);
  };

  const openEditDialog = (team: any) => {
    setEditingTeamId(team._id);
    setFormData({
      name: team.name,
      sport: team.sport || "",
      ageGroup: team.ageGroup || "",
      gender: (team.gender as TeamFormData["gender"]) || "",
      season: team.season || new Date().getFullYear().toString(),
      description: team.description || "",
      trainingSchedule: team.trainingSchedule || "",
      homeVenue: team.homeVenue || "",
      isActive: team.isActive ?? true,
    });
    setFormDialogOpen(true);
  };

  const openDeleteDialog = (team: { _id: string; name: string }) => {
    setTeamToDelete({ id: team._id, name: team.name });
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!(formData.name && formData.sport && formData.ageGroup)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      if (editingTeamId) {
        await updateTeamMutation({
          teamId: editingTeamId,
          name: formData.name,
          sport: formData.sport,
          ageGroup: formData.ageGroup,
          gender: formData.gender as "Boys" | "Girls" | "Mixed" | undefined,
          season: formData.season,
          description: formData.description || undefined,
          trainingSchedule: formData.trainingSchedule || undefined,
          homeVenue: formData.homeVenue || undefined,
          isActive: formData.isActive,
        });
        toast.success(`${formData.name} has been updated successfully.`);
      } else {
        await createTeamMutation({
          name: formData.name,
          organizationId: orgId,
          sport: formData.sport,
          ageGroup: formData.ageGroup,
          gender: formData.gender as "Boys" | "Girls" | "Mixed" | undefined,
          season: formData.season,
          description: formData.description || undefined,
          trainingSchedule: formData.trainingSchedule || undefined,
          homeVenue: formData.homeVenue || undefined,
          isActive: formData.isActive,
        });
        toast.success(`${formData.name} has been created successfully.`);
      }
      setFormDialogOpen(false);
      setFormData(defaultFormData);
      setEditingTeamId(null);
    } catch (error: any) {
      console.error("Error saving team:", error);
      toast.error(error.message || "Failed to save team");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!teamToDelete) return;

    setLoading(true);
    try {
      await deleteTeamMutation({
        teamId: teamToDelete.id,
      });
      toast.success(`${teamToDelete.name} has been deleted.`);
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    } catch (error: any) {
      console.error("Error deleting team:", error);
      toast.error(error.message || "Failed to delete team");
    } finally {
      setLoading(false);
    }
  };

  const getGenderBadgeColor = (gender?: string) => {
    switch (gender) {
      case "Boys":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "Girls":
        return "bg-pink-500/10 text-pink-600 border-pink-500/20";
      case "Mixed":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const hasWarnings = (team: any) => !(team.trainingSchedule && team.homeVenue);

  const stats = {
    total: teams?.length || 0,
    active: teams?.filter((t: any) => t.isActive !== false).length || 0,
    needsReview: teams?.filter((t: any) => hasWarnings(t)).length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Manage Teams</h1>
          <p className="mt-2 text-muted-foreground">
            Create and manage organization teams
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New Team
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Teams</p>
                <p className="font-bold text-2xl">{stats.total}</p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Active Teams</p>
                <p className="font-bold text-2xl text-green-600">
                  {stats.active}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Needs Review</p>
                <p className="font-bold text-2xl text-yellow-600">
                  {stats.needsReview}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search teams..."
            value={searchTerm}
          />
        </div>
        <Select onValueChange={setSportFilter} value={sportFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by sport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            {uniqueSports.map((sport: string) => (
              <SelectItem key={sport} value={sport}>
                {sport}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={setAgeGroupFilter} value={ageGroupFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by age" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {uniqueAgeGroups.map((age: string) => (
              <SelectItem key={age} value={age}>
                {age}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Teams List */}
      <Card>
        <CardHeader>
          <CardTitle>Teams ({filteredTeams?.length || 0})</CardTitle>
          <CardDescription>
            Click on a team to expand and see details
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4].map((i) => (
                <div className="p-4" key={i}>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTeams && filteredTeams.length > 0 ? (
            <div className="divide-y">
              {filteredTeams.map((team: any) => {
                const isExpanded = expandedTeams.has(team._id);
                const playerCount = getPlayerCount(team._id);
                const warnings = hasWarnings(team);

                return (
                  <Collapsible
                    key={team._id}
                    onOpenChange={() => toggleExpanded(team._id)}
                    open={isExpanded}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="cursor-pointer p-4 transition-colors hover:bg-accent/50">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{team.name}</p>
                              {team.isActive === false && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                              {warnings && (
                                <Badge
                                  className="border-yellow-500/20 bg-yellow-500/10 text-yellow-600"
                                  variant="outline"
                                >
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  Needs Review
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {team.sport && (
                                <Badge variant="outline">{team.sport}</Badge>
                              )}
                              {team.ageGroup && (
                                <Badge variant="outline">{team.ageGroup}</Badge>
                              )}
                              {team.gender && (
                                <Badge
                                  className={getGenderBadgeColor(team.gender)}
                                  variant="outline"
                                >
                                  {team.gender}
                                </Badge>
                              )}
                              <span className="text-muted-foreground text-sm">
                                {playerCount} players
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(team);
                              }}
                              size="icon"
                              variant="ghost"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog({
                                  _id: team._id,
                                  name: team.name,
                                });
                              }}
                              size="icon"
                              variant="ghost"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t bg-muted/30 px-4 pb-4">
                        <div className="space-y-4 pt-4">
                          {warnings && (
                            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                              <p className="mb-2 flex items-center gap-2 font-medium text-sm text-yellow-800">
                                <AlertCircle className="h-4 w-4" />
                                Missing Information
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {!team.trainingSchedule && (
                                  <Badge variant="outline">
                                    Training Schedule
                                  </Badge>
                                )}
                                {!team.homeVenue && (
                                  <Badge variant="outline">Home Venue</Badge>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="grid gap-4 sm:grid-cols-2">
                            {team.trainingSchedule && (
                              <div className="flex items-start gap-2">
                                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">
                                    Training Schedule
                                  </p>
                                  <p className="text-muted-foreground text-sm">
                                    {team.trainingSchedule}
                                  </p>
                                </div>
                              </div>
                            )}
                            {team.homeVenue && (
                              <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">
                                    Home Venue
                                  </p>
                                  <p className="text-muted-foreground text-sm">
                                    {team.homeVenue}
                                  </p>
                                </div>
                              </div>
                            )}
                            {team.season && (
                              <div className="flex items-start gap-2">
                                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">Season</p>
                                  <p className="text-muted-foreground text-sm">
                                    {team.season}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">Players</p>
                                <p className="text-muted-foreground text-sm">
                                  {playerCount} registered
                                </p>
                              </div>
                            </div>
                          </div>

                          {team.description && (
                            <div>
                              <p className="mb-1 font-medium text-sm">
                                Description
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {team.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold text-lg">No Teams Found</h3>
              <p className="mt-1 text-muted-foreground">
                {searchTerm || sportFilter !== "all" || ageGroupFilter !== "all"
                  ? "No teams match your search criteria"
                  : "Create your first team to get started"}
              </p>
              {!searchTerm &&
                sportFilter === "all" &&
                ageGroupFilter === "all" && (
                  <Button className="mt-4" onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Team
                  </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog onOpenChange={setFormDialogOpen} open={formDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTeamId ? "Edit Team" : "Create New Team"}
            </DialogTitle>
            <DialogDescription>
              {editingTeamId
                ? "Update the team details below."
                : "Fill in the details to create a new team."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., U12 Boys A"
                value={formData.name}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sport">Sport *</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, sport: value })
                  }
                  value={formData.sport}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORTS.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ageGroup">Age Group *</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, ageGroup: value })
                  }
                  value={formData.ageGroup}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select age" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map((age) => (
                      <SelectItem key={age} value={age}>
                        {age}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      gender: value as TeamFormData["gender"],
                    })
                  }
                  value={formData.gender}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Boys">Boys</SelectItem>
                    <SelectItem value="Girls">Girls</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="season">Season</Label>
                <Input
                  id="season"
                  onChange={(e) =>
                    setFormData({ ...formData, season: e.target.value })
                  }
                  placeholder="e.g., 2025"
                  value={formData.season}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trainingSchedule">Training Schedule</Label>
              <Input
                id="trainingSchedule"
                onChange={(e) =>
                  setFormData({ ...formData, trainingSchedule: e.target.value })
                }
                placeholder="e.g., Tuesdays & Thursdays 6-7pm"
                value={formData.trainingSchedule}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeVenue">Home Venue</Label>
              <Input
                id="homeVenue"
                onChange={(e) =>
                  setFormData({ ...formData, homeVenue: e.target.value })
                }
                placeholder="e.g., Main Pitch"
                value={formData.homeVenue}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional team description..."
                rows={3}
                value={formData.description}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active Team</Label>
              <Switch
                checked={formData.isActive}
                id="isActive"
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={loading}
              onClick={() => setFormDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                loading ||
                !formData.name ||
                !formData.sport ||
                !formData.ageGroup
              }
              onClick={handleSubmit}
            >
              {loading
                ? "Saving..."
                : editingTeamId
                  ? "Update Team"
                  : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{teamToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
              onClick={handleDelete}
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
