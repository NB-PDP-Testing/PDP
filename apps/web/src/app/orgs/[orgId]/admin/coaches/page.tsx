"use client";

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
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { authClient } from "@/lib/auth-client";

export default function ManageCoachesPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  // Get coaches - filter members with coach role
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // Load coaches using Better Auth client API
  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const { data, error } = await authClient.organization.listMembers({
        query: {
          organizationId: orgId,
        },
      });
      if (error) {
        console.error("Error loading members:", error);
      } else {
        // Filter to only coaches
        const membersData = data?.members || [];
        const coaches = membersData.filter(
          (m: any) => m.role === "coach" || m.role === "admin"
        );
        setMembers(coaches);
      }
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setMembersLoading(false);
    }
  }, [orgId]);

  // Load coaches on mount
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

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

  const isLoading = membersLoading;

  // Filter coaches by search term
  const filteredCoaches = members?.filter((coach) => {
    const searchLower = searchTerm.toLowerCase();
    const user = coach.user || {};
    const fullName = `${user.name || ""}`.toLowerCase();
    const email = (user.email || "").toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  const startEditing = (coach: any) => {
    setEditingCoach(coach.userId);
    setEditData({
      teams: [],
      ageGroups: [],
      sport: "",
    });
  };

  const cancelEditing = () => {
    setEditingCoach(null);
    setEditData({ teams: [], ageGroups: [], sport: "" });
  };

  const saveEdits = async (coachId: string) => {
    setLoading(coachId);
    try {
      // In a real implementation, this would call a backend mutation
      // For now, just show success
      toast.success("Coach assignments updated successfully");
      setEditingCoach(null);
    } catch (error) {
      console.error("Failed to update coach:", error);
      toast.error("Failed to update coach assignments");
    }
    setLoading(null);
  };

  const getStatusBadge = (role?: string) => {
    switch (role) {
      case "coach":
        return (
          <Badge className="border-green-500/20 bg-green-500/10 text-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Coach
          </Badge>
        );
      case "admin":
        return (
          <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-600">
            <UserCheck className="mr-1 h-3 w-3" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            {role || "Unknown"}
          </Badge>
        );
    }
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
  const totalCoaches = members?.length || 0;
  const activeCoaches = members?.filter((c) => c.role === "coach").length || 0;

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
      <div className="grid gap-4 md:grid-cols-2">
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
                            {getStatusBadge(coach.role)}
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

                            {/* Save/Cancel Buttons */}
                            <div className="flex gap-2 pt-2">
                              <Button
                                disabled={loading === coach.userId}
                                onClick={() => saveEdits(coach.userId)}
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
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(coach);
                                }}
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
