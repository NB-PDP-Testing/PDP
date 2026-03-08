"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Phone,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * Match Day Emergency Contacts View
 *
 * Quick access for coaches to see ICE contacts for all adult players.
 * Designed for use on match day with one-tap calling.
 */
export default function MatchDayPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [teamsExpanded, setTeamsExpanded] = useState(true);

  // what3words state
  const [w3wLoading, setW3wLoading] = useState(false);
  const [w3wGeoError, setW3wGeoError] = useState<string | null>(null);
  const [w3wMapUrl, setW3wMapUrl] = useState<string | null>(null);

  const handleW3WLocation = () => {
    if (!navigator.geolocation) {
      setW3wGeoError("Geolocation is not supported by this browser.");
      return;
    }
    setW3wLoading(true);
    setW3wGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toString();
        const lng = position.coords.longitude.toString();
        const mock = process.env.NEXT_PUBLIC_W3W_MOCK === "1" ? "&mock=1" : "";
        setW3wMapUrl(
          `/api/w3w-map?lat=${lat}&lng=${lng}&label=Current%20Location${mock}`
        );
        setW3wLoading(false);
      },
      (err) => {
        setW3wLoading(false);
        setW3wGeoError(`Could not get location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  // Get all adult players with their emergency contacts
  const emergencyData = useQuery(
    api.models.emergencyContacts.getForOrganization,
    {
      organizationId: orgId,
    }
  );

  // Get teams for selector
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Get team player links to filter by team and show player counts
  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    {
      organizationId: orgId,
      status: "active",
    }
  );

  // Player count per team
  const playerCountByTeam = useMemo(() => {
    const counts = new Map<string, number>();
    if (!teamPlayerLinks) {
      return counts;
    }
    for (const link of teamPlayerLinks) {
      counts.set(link.teamId, (counts.get(link.teamId) ?? 0) + 1);
    }
    return counts;
  }, [teamPlayerLinks]);

  // Players scoped to team filter only (for stats, not search)
  const teamScopedPlayers = useMemo(() => {
    if (!emergencyData) {
      return [];
    }
    if (selectedTeamId === "all" || !teamPlayerLinks) {
      return emergencyData;
    }
    const playerIdsInTeam = new Set(
      teamPlayerLinks
        .filter((link) => link.teamId === selectedTeamId)
        .map((link) => link.playerIdentityId.toString())
    );
    return emergencyData.filter((item) =>
      playerIdsInTeam.has(item.player._id.toString())
    );
  }, [emergencyData, selectedTeamId, teamPlayerLinks]);

  // Filter players (team + search)
  const filteredPlayers = useMemo(() => {
    let filtered = teamScopedPlayers;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.player.name.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [teamScopedPlayers, searchQuery]);

  // Count players without ICE contacts
  const playersWithoutICE = useMemo(
    () => teamScopedPlayers.filter((item) => !item.hasICE).length,
    [teamScopedPlayers]
  );

  // Selected team name for toggle label
  const selectedTeamName = useMemo(() => {
    if (selectedTeamId === "all" || !teams) {
      return "All Teams";
    }
    return (
      teams.find((t: any) => t._id === selectedTeamId)?.name ?? "All Teams"
    );
  }, [selectedTeamId, teams]);

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
      <div className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 p-4 text-white shadow-md md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Phone className="h-7 w-7 flex-shrink-0" />
            <div>
              <h1 className="font-bold text-xl md:text-2xl">
                Match Day - Emergency Contacts
              </h1>
              <p className="text-sm opacity-90">
                Quick access to ICE contacts for all players
              </p>
            </div>
          </div>
          <Badge
            className="flex items-center gap-2 border-white/30 bg-white/20 px-3 py-1.5 text-sm text-white"
            variant="outline"
          >
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString("en-IE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Card className="border-blue-200 bg-blue-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Users className="text-blue-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {teamScopedPlayers.length}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Players
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-500/20">
              <div
                className="h-1 rounded-full bg-blue-500"
                style={{ width: teamScopedPlayers.length > 0 ? "100%" : "0%" }}
              />
            </div>
          </CardContent>
        </Card>
        <Card
          className={`pt-0 transition-all duration-200 hover:shadow-lg ${playersWithoutICE === 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
        >
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Phone
                className={`${playersWithoutICE === 0 ? "text-green-500" : "text-red-500"}`}
                size={20}
              />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {teamScopedPlayers.length - playersWithoutICE}/
                {teamScopedPlayers.length}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              With ICE Contacts
            </div>
            <div
              className={`mt-2 h-1 w-full rounded-full ${playersWithoutICE === 0 ? "bg-green-500/20" : "bg-red-500/20"}`}
            >
              <div
                className={`h-1 rounded-full ${playersWithoutICE === 0 ? "bg-green-500" : "bg-red-500"}`}
                style={{ width: teamScopedPlayers.length > 0 ? "100%" : "0%" }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Shield className="text-purple-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {teamScopedPlayers.reduce(
                  (sum, item) =>
                    sum + item.contacts.filter((c) => c.priority <= 2).length,
                  0
                )}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Total ICE Contacts
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-500/20">
              <div
                className="h-1 rounded-full bg-purple-500"
                style={{ width: teamScopedPlayers.length > 0 ? "100%" : "0%" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* what3words Location card */}
        <Card
          className="cursor-pointer border-emerald-200 bg-emerald-50 pt-0 transition-all duration-200 hover:shadow-lg"
          onClick={handleW3WLocation}
        >
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              {w3wLoading ? (
                <Loader2 className="animate-spin text-emerald-500" size={20} />
              ) : (
                <MapPin className="text-emerald-500" size={20} />
              )}
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              {w3wLoading
                ? "Getting location…"
                : (w3wGeoError ?? "Generate a what3words emergency location")}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-emerald-500/20">
              <div className="h-1 w-0 rounded-full bg-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map dialog */}
      {w3wMapUrl && (
        <Dialog onOpenChange={(open) => !open && setW3wMapUrl(null)} open>
          <DialogContent className="flex h-[85vh] max-w-3xl flex-col gap-0 p-0">
            <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-2">
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                what3words Location
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden rounded-b-lg">
              <iframe
                className="h-full w-full border-0"
                src={w3wMapUrl}
                title="what3words map"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Team selector */}
      {teams.length > 0 && (
        <div>
          <button
            className="mb-3 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-gray-50"
            onClick={() => setTeamsExpanded((prev) => !prev)}
            type="button"
          >
            <span className="font-semibold text-gray-700 text-sm">
              {selectedTeamId === "all"
                ? "All Teams"
                : `${selectedTeamName} · selected`}
            </span>
            {teamsExpanded ? (
              <ChevronUp className="text-gray-500" size={18} />
            ) : (
              <ChevronDown className="text-gray-500" size={18} />
            )}
          </button>
          {teamsExpanded && (
            <div
              className={`grid gap-3 md:gap-4 ${teams.length === 1 ? "max-w-xs grid-cols-1" : "grid-cols-2 md:grid-cols-4"}`}
            >
              {teams.length > 1 && (
                <Card
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${selectedTeamId === "all" ? "ring-2 ring-green-500" : ""}`}
                  onClick={() => setSelectedTeamId("all")}
                  style={{
                    backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                    borderColor: "rgba(var(--org-primary-rgb), 0.25)",
                  }}
                >
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm leading-tight">
                          All Teams
                        </p>
                        <p className="text-gray-500 text-xs">
                          {teams.length} teams
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800 text-sm leading-tight">
                          {teams.reduce(
                            (sum: number, t: any) =>
                              sum + (playerCountByTeam.get(t._id) ?? 0),
                            0
                          )}
                        </p>
                        <p className="text-gray-500 text-xs">players</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {teams.map((team: any) => {
                const isSelected = selectedTeamId === team._id;
                const playerCount = playerCountByTeam.get(team._id) ?? 0;
                const ageMeta = [team.ageGroup, team.gender]
                  .filter(Boolean)
                  .join(" • ");
                return (
                  <Card
                    className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${isSelected ? "ring-2 ring-green-500" : ""}`}
                    key={team._id}
                    onClick={() => setSelectedTeamId(team._id)}
                    style={{
                      backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                      borderColor: "rgba(var(--org-primary-rgb), 0.25)",
                    }}
                  >
                    <CardContent className="p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-semibold text-gray-800 text-sm leading-tight"
                            title={team.name}
                          >
                            {team.name}
                          </p>
                          {ageMeta && (
                            <p className="text-gray-500 text-xs">{ageMeta}</p>
                          )}
                        </div>
                        <div className="ml-2 shrink-0 text-right">
                          <p className="font-bold text-gray-800 text-sm leading-tight">
                            {playerCount}
                          </p>
                          <p className="text-gray-500 text-xs">players</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter players..."
          value={searchQuery}
        />
      </div>

      {/* Player ICE Cards */}
      {filteredPlayers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">No players found</p>
            <p className="text-muted-foreground text-sm">
              {searchQuery || selectedTeamId !== "all"
                ? "Try adjusting your filters"
                : "No players are enrolled in this organization"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredPlayers.map((item) => (
            <div
              className="rounded-lg border p-3 transition-all duration-200 hover:shadow-md"
              key={item.player._id}
              style={{
                backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                borderColor: "rgba(var(--org-primary-rgb), 0.25)",
              }}
            >
              {/* Name + ICE badge */}
              <div className="mb-1 flex items-start justify-between gap-1">
                <p
                  className="truncate font-semibold text-gray-900 text-sm leading-tight"
                  title={item.player.name}
                >
                  {item.player.name}
                </p>
                {item.hasICE ? (
                  <Badge className="shrink-0 bg-green-100 text-[10px] text-green-700">
                    ICE ✓
                  </Badge>
                ) : (
                  <Badge className="shrink-0 text-[10px]" variant="destructive">
                    No ICE
                  </Badge>
                )}
              </div>

              {/* Age group */}
              {item.player.ageGroup && (
                <p className="mb-2 truncate text-gray-500 text-xs">
                  {item.player.ageGroup}
                </p>
              )}

              {/* Contacts */}
              {item.contacts.length === 0 ? (
                <div className="flex items-center gap-1 text-red-500 text-xs">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>No contacts</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {item.contacts.slice(0, 2).map((contact) => (
                    <a
                      className={`flex items-center gap-2 rounded p-1.5 transition-colors ${
                        contact.priority === 1
                          ? "bg-red-50 hover:bg-red-100"
                          : "bg-orange-50 hover:bg-orange-100"
                      }`}
                      href={`tel:${contact.phone}`}
                      key={contact._id}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-bold text-[10px] text-white ${
                          contact.priority === 1
                            ? "bg-red-600"
                            : "bg-orange-500"
                        }`}
                      >
                        {contact.priority}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-xs">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="truncate font-mono text-[10px] text-gray-500">
                          {contact.phone}
                        </p>
                      </div>
                      <Phone
                        className={`h-3.5 w-3.5 shrink-0 ${contact.priority === 1 ? "text-red-600" : "text-orange-500"}`}
                      />
                    </a>
                  ))}
                  {item.contacts.length > 2 && (
                    <p className="text-center text-gray-400 text-xs">
                      +{item.contacts.length - 2} more
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
