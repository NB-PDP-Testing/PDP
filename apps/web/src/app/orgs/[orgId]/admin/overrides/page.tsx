"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { Calendar, Plus, Shield, Trash2, User } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import { authClient } from "@/lib/auth-client";

export default function OverridesManagementPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: session } = authClient.useSession();

  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [isPermanent, setIsPermanent] = useState(false);

  // Queries
  const overrides = useQuery(
    api.models.ageGroupEligibilityOverrides.getOrganizationOverrides,
    { organizationId: orgId, includeInactive: false }
  );
  const allOverrides = useQuery(
    api.models.ageGroupEligibilityOverrides.getOrganizationOverrides,
    { organizationId: orgId, includeInactive: true }
  );
  const players = useQuery(api.models.orgPlayerEnrollments.getPlayersForOrg, {
    organizationId: orgId,
  });
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Mutations
  const grantOverride = useMutation(
    api.models.ageGroupEligibilityOverrides.grantEligibilityOverride
  );
  const revokeOverride = useMutation(
    api.models.ageGroupEligibilityOverrides.revokeEligibilityOverride
  );
  const extendExpiration = useMutation(
    api.models.ageGroupEligibilityOverrides.extendOverrideExpiration
  );

  // Handle grant override
  const handleGrantOverride = async () => {
    if (!(selectedPlayer && selectedTeam && reason.trim())) {
      toast.error("Please select a player, team, and provide a reason");
      return;
    }

    if (!session?.user?.email) {
      toast.error("User email not found");
      return;
    }

    try {
      const expirationTimestamp = isPermanent
        ? undefined
        : expiresAt
          ? new Date(expiresAt).getTime()
          : undefined;

      await grantOverride({
        playerIdentityId: selectedPlayer as any,
        teamId: selectedTeam,
        organizationId: orgId,
        reason: reason.trim(),
        expiresAt: expirationTimestamp,
        grantedBy: session.user.email,
      });

      toast.success("Eligibility override has been granted successfully");

      // Reset form
      setSelectedPlayer("");
      setSelectedTeam("");
      setReason("");
      setExpiresAt("");
      setIsPermanent(false);
      setGrantDialogOpen(false);
    } catch (error) {
      toast.error(
        `Error granting override: ${error instanceof Error ? error.message : "Unknown error occurred"}`
      );
    }
  };

  // Handle revoke override
  const handleRevokeOverride = async (overrideId: string) => {
    if (!session?.user?.email) {
      toast.error("User email not found");
      return;
    }

    try {
      await revokeOverride({
        overrideId: overrideId as any,
        revokedBy: session.user.email,
      });

      toast.success("Eligibility override has been revoked successfully");
    } catch (error) {
      toast.error(
        `Error revoking override: ${error instanceof Error ? error.message : "Unknown error occurred"}`
      );
    }
  };

  // Handle extend expiration
  const handleExtendExpiration = async (
    overrideId: string,
    permanent: boolean
  ) => {
    try {
      await extendExpiration({
        overrideId: overrideId as any,
        newExpiresAt: permanent
          ? undefined
          : Date.now() + 365 * 24 * 60 * 60 * 1000, // +1 year if not permanent
      });

      toast.success(
        permanent ? "Override is now permanent" : "Override extended by 1 year"
      );
    } catch (error) {
      toast.error(
        `Error updating expiration: ${error instanceof Error ? error.message : "Unknown error occurred"}`
      );
    }
  };

  // Get player name
  const getPlayerName = (playerIdentityId: string) => {
    const player = players?.find((p) => p._id === playerIdentityId);
    return player ? `${player.firstName} ${player.lastName}` : "Unknown Player";
  };

  // Get team name
  const getTeamName = (teamId: string) => {
    const team = teams?.find((t) => t._id === teamId);
    return team ? team.name : "Unknown Team";
  };

  // Filter active and historical overrides
  const activeOverrides = overrides || [];
  const historicalOverrides =
    allOverrides?.filter(
      (o) => !o.isActive || (o.expiresAt && o.expiresAt < Date.now())
    ) || [];

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Eligibility Overrides</h1>
          <p className="mt-2 text-muted-foreground">
            Manage individual player eligibility exceptions
          </p>
        </div>

        <Dialog onOpenChange={setGrantDialogOpen} open={grantDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Grant Override
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Grant Eligibility Override</DialogTitle>
              <DialogDescription>
                Grant a player permission to join a team they wouldn't normally
                be eligible for
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Player Selection */}
              <div className="space-y-2">
                <Label htmlFor="player">Player *</Label>
                <Select
                  onValueChange={setSelectedPlayer}
                  value={selectedPlayer}
                >
                  <SelectTrigger id="player">
                    <SelectValue placeholder="Select a player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {players?.map((player) => (
                      <SelectItem key={player._id} value={player._id}>
                        {player.firstName} {player.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team Selection */}
              <div className="space-y-2">
                <Label htmlFor="team">Team *</Label>
                <Select onValueChange={setSelectedTeam} value={selectedTeam}>
                  <SelectTrigger id="team">
                    <SelectValue placeholder="Select a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((team) => (
                      <SelectItem key={team._id} value={team._id}>
                        {team.name} ({team.ageGroup})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this override is needed..."
                  rows={3}
                  value={reason}
                />
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <input
                    checked={isPermanent}
                    className="h-4 w-4"
                    id="permanent"
                    onChange={(e) => setIsPermanent(e.target.checked)}
                    type="checkbox"
                  />
                  <Label className="cursor-pointer" htmlFor="permanent">
                    Permanent (no expiration)
                  </Label>
                </div>

                {!isPermanent && (
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expires On</Label>
                    <Input
                      id="expiresAt"
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      type="date"
                      value={expiresAt}
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setGrantDialogOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={handleGrantOverride}>Grant Override</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs className="space-y-6" defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active Overrides ({activeOverrides.length})
          </TabsTrigger>
          <TabsTrigger value="historical">
            Historical ({historicalOverrides.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Overrides */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Overrides</CardTitle>
              <CardDescription>
                Currently active eligibility overrides for players in your
                organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeOverrides.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Shield className="mx-auto mb-4 h-12 w-12 opacity-20" />
                  <p>No active overrides</p>
                  <p className="mt-2 text-sm">
                    Grant an override to allow players to join teams they
                    wouldn't normally be eligible for
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Granted By</TableHead>
                      <TableHead>Granted On</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeOverrides.map((override) => (
                      <TableRow key={override._id}>
                        <TableCell className="font-medium">
                          {getPlayerName(override.playerIdentityId)}
                        </TableCell>
                        <TableCell>{getTeamName(override.teamId)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {override.reason}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {override.grantedBy}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {format(
                                new Date(override.grantedAt),
                                "MMM d, yyyy"
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {override.expiresAt ? (
                            <Badge
                              variant={
                                override.expiresAt < Date.now()
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {format(
                                new Date(override.expiresAt),
                                "MMM d, yyyy"
                              )}
                            </Badge>
                          ) : (
                            <Badge>Permanent</Badge>
                          )}
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          {override.expiresAt && (
                            <Button
                              onClick={() =>
                                handleExtendExpiration(override._id, true)
                              }
                              size="sm"
                              variant="outline"
                            >
                              Make Permanent
                            </Button>
                          )}
                          <Button
                            onClick={() => handleRevokeOverride(override._id)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Revoke
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

        {/* Historical Overrides */}
        <TabsContent value="historical">
          <Card>
            <CardHeader>
              <CardTitle>Historical Overrides</CardTitle>
              <CardDescription>
                Past overrides that have been revoked or expired
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historicalOverrides.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p>No historical overrides</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Granted</TableHead>
                      <TableHead>Ended</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicalOverrides.map((override) => (
                      <TableRow key={override._id}>
                        <TableCell className="font-medium">
                          {getPlayerName(override.playerIdentityId)}
                        </TableCell>
                        <TableCell>{getTeamName(override.teamId)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {override.reason}
                        </TableCell>
                        <TableCell>
                          {override.revokedAt ? (
                            <Badge variant="destructive">Revoked</Badge>
                          ) : override.expiresAt &&
                            override.expiresAt < Date.now() ? (
                            <Badge variant="secondary">Expired</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(override.grantedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {override.revokedAt
                            ? format(
                                new Date(override.revokedAt),
                                "MMM d, yyyy"
                              )
                            : override.expiresAt
                              ? format(
                                  new Date(override.expiresAt),
                                  "MMM d, yyyy"
                                )
                              : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
