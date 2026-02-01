"use client";

import { ChevronDown, ChevronUp, FileText, User, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PlayerWithNotes = {
  _id: string;
  name: string;
  ageGroup?: string;
  teamName?: string;
  teams?: string[];
  coachNotes?: string;
};

type CoachNotesSectionProps = {
  players: PlayerWithNotes[];
};

export function CoachNotesSection({ players }: CoachNotesSectionProps) {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter players that have coach notes
  const playersWithNotes = useMemo(
    () => players.filter((p) => p.coachNotes && p.coachNotes.trim().length > 0),
    [players]
  );

  // Don't render if no players have notes
  if (playersWithNotes.length === 0) {
    return null;
  }

  const handleViewPlayer = (playerId: string) => {
    router.push(`/orgs/${orgId}/players/${playerId}`);
  };

  const handleEditPlayer = (playerId: string) => {
    router.push(`/orgs/${orgId}/admin/players/${playerId}/edit`);
  };

  // Truncate note for preview
  const truncateNote = (note: string, maxLength = 100) => {
    if (note.length <= maxLength) {
      return note;
    }
    return `${note.substring(0, maxLength).trim()}...`;
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            <span>My Player Notes</span>
            <Badge
              className="ml-2 bg-amber-100 text-amber-700"
              variant="secondary"
            >
              {playersWithNotes.length}
            </Badge>
          </div>
          <Button className="h-8 w-8 p-0" size="sm" variant="ghost">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {playersWithNotes.map((player) => (
              <div
                className="rounded-lg border border-amber-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                key={player._id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {player.name}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-gray-500 text-sm">
                      {player.ageGroup && (
                        <Badge className="text-xs" variant="outline">
                          {player.ageGroup}
                        </Badge>
                      )}
                      {player.teams && player.teams.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {player.teams.length === 1
                            ? player.teams[0]
                            : `${player.teams.length} teams`}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-gray-600 text-sm">
                      {truncateNote(player.coachNotes || "")}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <Button
                      onClick={() => handleViewPlayer(player._id)}
                      size="sm"
                      variant="outline"
                    >
                      View
                    </Button>
                    <Button
                      onClick={() => handleEditPlayer(player._id)}
                      size="sm"
                      variant="default"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-gray-500 text-xs">
            Click Edit to update notes on any player
          </p>
        </CardContent>
      )}
    </Card>
  );
}
