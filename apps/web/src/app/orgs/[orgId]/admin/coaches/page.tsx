"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
  Mail,
  Phone,
  Save,
  Search,
  Shield,
  UserCheck,
  UserCircle,
  Users,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export default function ManageCoachesPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  // Get teams and players from backend
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });
  const allPlayersData = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    {
      organizationId: orgId,
    }
  );

  // Get team-player links for accurate counts
  const teamPlayerLinks = useQuery(api.models.teams.getTeamPlayerLinks, {
    organizationId: orgId,
  });

  // Get coach assignments
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsByOrganization,
    { organizationId: orgId }
  );

  // Mutation for updating coach assignments
  const updateCoachAssignmentsMutation = useMutation(
    api.models.coaches.updateCoachAssignments
  );

  // Get members with coach functional role using Convex query
  const membersWithDetails = useQuery(
    api.models.members.getMembersWithDetails,
    { organizationId: orgId }
  );

  // Filter to only users with coach functional role
  const coaches = membersWithDetails?.filter((m) =>
    m.functionalRoles?.includes("coach")
  );

  const membersLoading = membersWithDetails === undefined;

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCoach, setExpandedCoach] = useState<string | null>(null);
  const [editingCoach, setEditingCoach] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Edit state for coach assignments
  const [editData, setEditData] = useState<{
    teams: string[];
    ageGroups: string[];
    sport: string;
  }>({
    teams: [],
    ageGroups: [],
    sport: "",
  });

  const isLoading =
    membersLoading ||
    teams === undefined ||
    allPlayersData === undefined ||
    coachAssignments === undefined ||
    teamPlayerLinks === undefined;

  // Get unique teams - use objects with id and name to preserve both
  const uniqueTeams =
    teams?.map((t: any) => ({ id: t._id, name: t.name })) || [];
  const uniqueAgeGroups = [
    ...new Set(teams?.map((t: any) => t.ageGroup).filter(Boolean) || []),
  ].sort();

  // Helper to get coach assignment data
  const getCoachData = (userId: string) => {
    const assignment = coachAssignments?.find((ca) => ca.userId === userId);
    return (
      assignment || {
        teams: [],
        ageGroups: [],
        sport: "",
        roles: [],
      }
    );
  };

  // Helper to get team name from team ID
  const getTeamName = (teamId: string) => {
    const team = teams?.find((t: any) => t._id === teamId);
    return team?.name || teamId;
  };

  // Helper functions to calculate player counts using teamPlayerLinks
  const getCoachPlayerCount = (coachTeamIds: string[]) => {
    if (!coachTeamIds || coachTeamIds.length === 0 || !teamPlayerLinks)
      return 0;
    return teamPlayerLinks.filter((link: any) =>
      coachTeamIds.includes(link.teamId)
    ).length;
  };

  const getTeamPlayerCount = (teamId: string) => {
    if (!teamPlayerLinks) return 0;
    return teamPlayerLinks.filter((link: any) => link.teamId === teamId).length;
  };

  // Filter coaches by search term
  const filteredCoaches = coaches?.filter((coach) => {
    const searchLower = searchTerm.toLowerCase();
    const user = coach.user || {};
    const fullName = `${user.name || ""}`.toLowerCase();
    const email = (user.email || "").toLowerCase();
    const coachData = getCoachData(coach.userId);
    const teams = (coachData.teams || []).join(" ").toLowerCase();
    return (
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      teams.includes(searchLower)
    );
  });

  const startEditing = (coach: any) => {
    const coachData = getCoachData(coach.userId);
    setEditingCoach(coach.userId);
    setEditData({
      teams: coachData.teams || [],
      ageGroups: coachData.ageGroups || [],
      sport: coachData.sport || "",
    });
  };

  const cancelEditing = () => {
    setEditingCoach(null);
    setEditData({ teams: [], ageGroups: [], sport: "" });
  };

  const saveEdits = async (coach: any) => {
    setLoading(coach.userId);
    try {
      await updateCoachAssignmentsMutation({
        userId: coach.userId,
        organizationId: orgId,
        teams: editData.teams,
        ageGroups: editData.ageGroups,
        sport: editData.sport,
      });

      toast.success("Coach assignments updated successfully");
      setEditingCoach(null);
    } catch (error: any) {
      console.error("Failed to update coach:", error);
      toast.error(error.message || "Failed to update coach assignments");
    } finally {
      setLoading(null);
    }
  };

  const toggleTeam = (team: string) => {
    setEditData((prev) => ({
      ...prev,
      teams: prev.teams.includes(team)
        ? prev.teams.filter((t) => t !== team)
        : [...prev.teams, team],
    }));
  };

  const toggleAgeGroup = (ageGroup: string) => {
    setEditData((prev) => ({
      ...prev,
      ageGroups: prev.ageGroups.includes(ageGroup)
        ? prev.ageGroups.filter((ag) => ag !== ageGroup)
        : [...prev.ageGroups, ageGroup],
    }));
  };

  const getStatusBadge = (coach: any) => {
    const functionalRoles = coach.functionalRoles || [];
    const hasCoach = functionalRoles.includes("coach");
    const hasAdmin = functionalRoles.includes("admin");
    const hasParent = functionalRoles.includes("parent");

    // Build role display with icons
    const roles = [];
    if (hasAdmin) {
      roles.push(
        <span className="inline-flex items-center gap-1" key="admin">
          <Shield className="h-3 w-3" />
          Admin
        </span>
      );
    }
    if (hasCoach) {
      roles.push(
        <span className="inline-flex items-center gap-1" key="coach">
          <Users className="h-3 w-3" />
          Coach
        </span>
      );
    }
    if (hasParent) {
      roles.push(
        <span className="inline-flex items-center gap-1" key="parent">
          <UserCircle className="h-3 w-3" />
          Parent
        </span>
      );
    }

    if (roles.length === 0) {
      return (
        <Badge
          className="border-gray-300 bg-gray-100 text-gray-600"
          variant="outline"
        >
          <UserCheck className="mr-1 h-3 w-3" />
          Member
        </Badge>
      );
    }

    return (
      <Badge
        className={
          hasAdmin
            ? "border-blue-500/20 bg-blue-500/10 text-blue-600"
            : "border-green-500/20 bg-green-500/10 text-green-600"
        }
      >
        <CheckCircle className="mr-1 h-3 w-3" />
        {roles.reduce(
          (prev, curr, i) => (i === 0 ? [curr] : [...prev, " + ", curr]),
          [] as React.ReactNode[]
        )}
      </Badge>
    );
  };

  const getInitials = (user: any) => {
    if (user.name) {
      return user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    return "??";
  };

  // Stats
  const totalCoaches = coaches?.length || 0;
  const activeCoaches =
    coaches?.filter((c) => c.functionalRoles?.includes("coach")).length || 0;
  const pendingCoaches = 0; // No pending status with functional roles

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Manage Coaches</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage all registered coaches
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Coaches</p>
                <p className="font-bold text-2xl">{totalCoaches}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Active</p>
                <p className="font-bold text-2xl text-green-600">
                  {activeCoaches}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        {pendingCoaches > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pending</p>
                  <p className="font-bold text-2xl text-yellow-600">
                    {pendingCoaches}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search coaches by name or email..."
          value={searchTerm}
        />
      </div>

      {/* Coaches List */}
      <Card>
        <CardHeader>
          <CardTitle>Coaches ({filteredCoaches?.length || 0})</CardTitle>
          <CardDescription>
            Click on a coach to expand and manage details
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div className="p-4" key={i}>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCoaches && filteredCoaches.length > 0 ? (
            <div className="divide-y">
              {filteredCoaches.map((coach) => {
                const user = coach.user || {};
                const coachData = getCoachData(coach.userId);
                const coachTeams = coachData.teams || [];
                const playerCount = getCoachPlayerCount(coachTeams);
                const isExpanded = expandedCoach === coach.userId;
                const isEditing = editingCoach === coach.userId;

                return (
                  <Collapsible
                    key={coach.userId}
                    onOpenChange={() =>
                      setExpandedCoach(isExpanded ? null : coach.userId)
                    }
                    open={isExpanded}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="cursor-pointer p-4 transition-colors hover:bg-accent/50">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback>{getInitials(user)}</AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">
                                {user.name || "Unknown"}
                              </p>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3">
                              <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                <Mail className="h-3 w-3" />
                                {user.email || "No email"}
                              </span>
                              {user.phone && (
                                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                  <Phone className="h-3 w-3" />
                                  {user.phone}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              {getStatusBadge(coach)}
                              <p className="mt-1 text-muted-foreground text-xs">
                                {playerCount} player
                                {playerCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Quick view of teams */}
                        {coachTeams && coachTeams.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {coachTeams.map((teamId: string) => {
                              const teamPlayerCount =
                                getTeamPlayerCount(teamId);
                              const teamName = getTeamName(teamId);
                              return (
                                <span
                                  className="rounded-lg bg-green-50 px-2 py-1 text-green-700 text-xs"
                                  key={teamId}
                                >
                                  {teamName} ({teamPlayerCount})
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t bg-muted/30 px-4 pb-4">
                        {isEditing ? (
                          /* Edit Mode */
                          <div className="space-y-4 pt-4">
                            {/* Sport Selection */}
                            <div>
                              <Label className="mb-2 block font-medium text-sm">
                                Primary Sport
                              </Label>
                              <Select
                                onValueChange={(value) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    sport: value,
                                  }))
                                }
                                value={editData.sport}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select sport" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="GAA Football">
                                    GAA Football
                                  </SelectItem>
                                  <SelectItem value="Soccer">Soccer</SelectItem>
                                  <SelectItem value="Rugby">Rugby</SelectItem>
                                  <SelectItem value="GAA Hurling">
                                    GAA Hurling
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Team Assignments */}
                            <div>
                              <Label className="mb-2 block font-medium text-sm">
                                Team Assignments
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {uniqueTeams.length > 0 ? (
                                  uniqueTeams.map((team) => (
                                    <Button
                                      className={
                                        editData.teams.includes(team.id)
                                          ? "bg-green-600 text-white hover:bg-green-700"
                                          : ""
                                      }
                                      key={team.id}
                                      onClick={() => toggleTeam(team.id)}
                                      size="sm"
                                      type="button"
                                      variant={
                                        editData.teams.includes(team.id)
                                          ? "default"
                                          : "outline"
                                      }
                                    >
                                      {team.name}
                                    </Button>
                                  ))
                                ) : (
                                  <p className="text-muted-foreground text-sm">
                                    No teams available. Create teams first.
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Age Group Assignments */}
                            <div>
                              <Label className="mb-2 block font-medium text-sm">
                                Age Group Assignments
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {uniqueAgeGroups.length > 0 ? (
                                  uniqueAgeGroups.map((ageGroup) => (
                                    <Button
                                      className={
                                        editData.ageGroups.includes(ageGroup)
                                          ? "bg-blue-600 text-white hover:bg-blue-700"
                                          : ""
                                      }
                                      key={ageGroup}
                                      onClick={() => toggleAgeGroup(ageGroup)}
                                      size="sm"
                                      type="button"
                                      variant={
                                        editData.ageGroups.includes(ageGroup)
                                          ? "default"
                                          : "outline"
                                      }
                                    >
                                      {ageGroup}
                                    </Button>
                                  ))
                                ) : (
                                  <p className="text-muted-foreground text-sm">
                                    No age groups available
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Save/Cancel Buttons */}
                            <div className="flex gap-2 pt-2">
                              <Button
                                disabled={loading === coach.userId}
                                onClick={() => saveEdits(coach)}
                              >
                                <Save className="mr-2 h-4 w-4" />
                                {loading === coach.userId
                                  ? "Saving..."
                                  : "Save Changes"}
                              </Button>
                              <Button onClick={cancelEditing} variant="outline">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="space-y-4 pt-4">
                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-wider">
                                  Sport
                                </p>
                                <p className="mt-1 font-medium">
                                  {coachData.sport || "Not specified"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-wider">
                                  Joined
                                </p>
                                <p className="mt-1 flex items-center gap-1 font-medium">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {coach.createdAt
                                    ? new Date(
                                        coach.createdAt
                                      ).toLocaleDateString()
                                    : "Unknown"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-wider">
                                  Age Groups
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {coachData.ageGroups &&
                                  coachData.ageGroups.length > 0 ? (
                                    coachData.ageGroups.map((ag: string) => (
                                      <Badge
                                        className="bg-blue-50 text-blue-700"
                                        key={ag}
                                        variant="outline"
                                      >
                                        {ag}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground text-sm">
                                      None assigned
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-wider">
                                  Email Verified
                                </p>
                                <p className="mt-1 font-medium">
                                  {user.emailVerified ? (
                                    <Badge
                                      className="border-green-500/20 bg-green-500/10 text-green-600"
                                      variant="outline"
                                    >
                                      <CheckCircle className="mr-1 h-3 w-3" />
                                      Yes
                                    </Badge>
                                  ) : (
                                    <Badge
                                      className="border-red-500/20 bg-red-500/10 text-red-600"
                                      variant="outline"
                                    >
                                      <XCircle className="mr-1 h-3 w-3" />
                                      No
                                    </Badge>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between border-t pt-3">
                              <p className="text-muted-foreground text-sm">
                                Last updated:{" "}
                                {"updatedAt" in coachData && coachData.updatedAt
                                  ? new Date(
                                      coachData.updatedAt
                                    ).toLocaleDateString()
                                  : "Never"}
                              </p>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(coach);
                                }}
                                size="sm"
                                variant="outline"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Assignments
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold text-lg">No Coaches Found</h3>
              <p className="mt-1 text-muted-foreground">
                {searchTerm
                  ? "No coaches match your search"
                  : "No coaches registered yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
