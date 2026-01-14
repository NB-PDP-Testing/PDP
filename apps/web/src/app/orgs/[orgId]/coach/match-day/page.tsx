"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Loader2,
  Phone,
  Search,
  Shield,
  User,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Match Day Emergency Contacts View
 *
 * Quick access for coaches to see ICE contacts for all adult players.
 * Designed for use on match day with one-tap calling.
 */
export default function MatchDayPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  // Get all adult players with their emergency contacts
  const emergencyData = useQuery(
    api.models.emergencyContacts.getForOrganization,
    {
      organizationId: orgId,
    }
  );

  // Get teams for filter
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Get team player links to filter by team
  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    {
      organizationId: orgId,
      status: "active",
    }
  );

  // Filter players
  const filteredPlayers = useMemo(() => {
    if (!emergencyData) {
      return [];
    }

    let filtered = emergencyData;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.player.name.toLowerCase().includes(query)
      );
    }

    // Team filter
    if (teamFilter !== "all" && teamPlayerLinks) {
      const playerIdsInTeam = new Set(
        teamPlayerLinks
          .filter((link) => link.teamId === teamFilter)
          .map((link) => link.playerIdentityId.toString())
      );
      filtered = filtered.filter((item) =>
        playerIdsInTeam.has(item.player._id.toString())
      );
    }

    return filtered;
  }, [emergencyData, searchQuery, teamFilter, teamPlayerLinks]);

  // Count players without ICE contacts
  const playersWithoutICE = useMemo(() => {
    if (!emergencyData) {
      return 0;
    }
    return emergencyData.filter((item) => !item.hasICE).length;
  }, [emergencyData]);

  // Loading state
  if (emergencyData === undefined || teams === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push(`/orgs/${orgId}/coach`)}
            size="sm"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="font-bold text-2xl">
              Match Day - Emergency Contacts
            </h1>
            <p className="text-muted-foreground text-sm">
              Quick access to ICE contacts for adult players
            </p>
          </div>
        </div>
        <Badge
          className="flex items-center gap-2 px-4 py-2 text-lg"
          variant="outline"
        >
          <Calendar className="h-5 w-5" />
          {new Date().toLocaleDateString("en-IE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </Badge>
      </div>

      {/* Alert for players without ICE contacts */}
      {playersWithoutICE > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">
                {playersWithoutICE} player{playersWithoutICE > 1 ? "s" : ""}{" "}
                without emergency contacts
              </p>
              <p className="text-amber-700 text-sm">
                These players have not set up any ICE contacts. Remind them to
                add emergency contacts.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Adult Players</p>
                <p className="font-bold text-2xl">{emergencyData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            playersWithoutICE === 0 ? "border-green-200" : "border-red-200"
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  playersWithoutICE === 0 ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <Phone
                  className={`h-6 w-6 ${
                    playersWithoutICE === 0 ? "text-green-600" : "text-red-600"
                  }`}
                />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  With ICE Contacts
                </p>
                <p className="font-bold text-2xl">
                  {emergencyData.length - playersWithoutICE} /{" "}
                  {emergencyData.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Total ICE Contacts
                </p>
                <p className="font-bold text-2xl">
                  {emergencyData.reduce(
                    (sum, item) =>
                      sum + item.contacts.filter((c) => c.priority <= 2).length,
                    0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search players..."
                  value={searchQuery}
                />
              </div>
            </div>
            {teams && teams.length > 0 && (
              <Select onValueChange={setTeamFilter} value={teamFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((team: any) => (
                    <SelectItem key={team._id} value={team._id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Player ICE Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPlayers.map((item) => (
          <Card
            className={item.hasICE ? "border-green-200" : "border-red-200"}
            key={item.player._id}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {item.player.name}
                    </CardTitle>
                    <CardDescription>{item.player.ageGroup}</CardDescription>
                  </div>
                </div>
                {item.hasICE ? (
                  <Badge className="bg-green-100 text-green-700">ICE ✓</Badge>
                ) : (
                  <Badge variant="destructive">No ICE</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {item.contacts.length === 0 ? (
                <div className="rounded-lg border border-red-200 border-dashed bg-red-50 py-4 text-center">
                  <AlertTriangle className="mx-auto h-6 w-6 text-red-400" />
                  <p className="mt-1 text-red-700 text-sm">
                    No emergency contacts
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {item.contacts.slice(0, 2).map((contact) => (
                    <a
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                        contact.priority === 1
                          ? "border-red-200 bg-red-50 hover:bg-red-100"
                          : "border-orange-200 bg-orange-50 hover:bg-orange-100"
                      }`}
                      href={`tel:${contact.phone}`}
                      key={contact._id}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm text-white ${
                          contact.priority === 1
                            ? "bg-red-600"
                            : "bg-orange-500"
                        }`}
                      >
                        {contact.priority}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-muted-foreground text-xs capitalize">
                          {contact.relationship}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {contact.phone}
                        </span>
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            contact.priority === 1
                              ? "bg-red-600"
                              : "bg-orange-500"
                          } text-white`}
                        >
                          <Phone className="h-4 w-4" />
                        </div>
                      </div>
                    </a>
                  ))}
                  {item.contacts.length > 2 && (
                    <p className="text-center text-muted-foreground text-xs">
                      +{item.contacts.length - 2} more contact
                      {item.contacts.length - 2 > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredPlayers.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-medium">No adult players found</p>
              <p className="text-muted-foreground text-sm">
                {searchQuery || teamFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No adult players are enrolled in this organization"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
