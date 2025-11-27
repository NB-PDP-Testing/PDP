"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

interface EditState {
  firstName: string;
  lastName: string;
  phone: string;
  isEditing: boolean;
  hasChanges: boolean;
}

export default function ManageUsersPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  // Get organization members using Better Auth client
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // Load members on mount
  useState(() => {
    const loadMembers = async () => {
      try {
        const { data } = await authClient.organization.listMembers({
          organizationId: orgId,
        });
        setMembers(data || []);
      } catch (error) {
        console.error("Error loading members:", error);
      } finally {
        setMembersLoading(false);
      }
    };
    loadMembers();
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const isLoading = membersLoading;

  // Filter members
  const filteredMembers = members?.filter((member) => {
    if (roleFilter !== "all" && member.role !== roleFilter) {
      return false;
    }
    if (!searchTerm) return true;
    const user = member.user || {};
    const searchable = [user.firstName, user.lastName, user.name, user.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(searchTerm.toLowerCase());
  });

  const toggleExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const getInitials = (user: any) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
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

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge className="bg-purple-500/10 text-purple-600">Owner</Badge>
        );
      case "admin":
        return <Badge className="bg-blue-500/10 text-blue-600">Admin</Badge>;
      case "member":
        return <Badge variant="secondary">Member</Badge>;
      default:
        return <Badge variant="outline">{role || "Unknown"}</Badge>;
    }
  };

  // Stats
  const stats = {
    total: members?.length || 0,
    owners: members?.filter((m) => m.role === "owner").length || 0,
    admins: members?.filter((m) => m.role === "admin").length || 0,
    members: members?.filter((m) => m.role === "member").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Manage Users</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage organization members
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setRoleFilter("all")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Members</p>
                <p className="font-bold text-2xl">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setRoleFilter("owner")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Owners</p>
                <p className="font-bold text-2xl text-purple-600">
                  {stats.owners}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setRoleFilter("admin")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Admins</p>
                <p className="font-bold text-2xl text-blue-600">
                  {stats.admins}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setRoleFilter("member")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Members</p>
                <p className="font-bold text-2xl">{stats.members}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name or email..."
            value={searchTerm}
          />
        </div>
        {roleFilter !== "all" && (
          <Button
            onClick={() => setRoleFilter("all")}
            size="sm"
            variant="ghost"
          >
            <X className="mr-2 h-4 w-4" />
            Clear filter: {roleFilter}
          </Button>
        )}
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Organization Members ({filteredMembers?.length || 0})
          </CardTitle>
          <CardDescription>
            Users who are part of this organization
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
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
          ) : filteredMembers && filteredMembers.length > 0 ? (
            <div className="divide-y">
              {filteredMembers.map((member) => {
                const user = member.user || {};
                const isExpanded = expandedUsers.has(member.userId);

                return (
                  <Collapsible
                    key={member._id}
                    onOpenChange={() => toggleExpanded(member.userId)}
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
                                {user.firstName || user.name || "Unknown"}{" "}
                                {user.lastName || ""}
                              </p>
                            </div>
                            <p className="truncate text-muted-foreground text-sm">
                              {user.email || "No email"}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            {getRoleBadge(member.role)}
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
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <p className="font-medium text-sm">Role</p>
                              <p className="text-muted-foreground text-sm">
                                {member.role}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <p className="font-medium text-sm">
                                Member Since
                              </p>
                              <p className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Calendar className="h-4 w-4" />
                                {new Date(
                                  member.createdAt
                                ).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <p className="font-medium text-sm">Email</p>
                              <p className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Mail className="h-4 w-4" />
                                {user.email || "—"}
                                {user.emailVerified && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </p>
                            </div>

                            {user.phone && (
                              <div className="space-y-2">
                                <p className="font-medium text-sm">Phone</p>
                                <p className="flex items-center gap-2 text-muted-foreground text-sm">
                                  <Phone className="h-4 w-4" />
                                  {user.phone}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold text-lg">No Members Found</h3>
              <p className="mt-1 text-muted-foreground">
                {searchTerm || roleFilter !== "all"
                  ? "No members match your search criteria"
                  : "No members in this organization yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
