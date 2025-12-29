"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { MessageSquare, User } from "lucide-react";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CoachFeedbackProps {
  children: Array<{
    player: {
      _id: Id<"playerIdentities">;
      firstName: string;
      lastName: string;
    };
  }>;
  orgId: string;
}

export function CoachFeedback({ children, orgId }: CoachFeedbackProps) {
  // Get passport data for all children to access coach notes
  const childPassports = children.map((child) => {
    const passportData = useQuery(
      api.models.sportPassports.getFullPlayerPassportView,
      {
        playerIdentityId: child.player._id,
        organizationId: orgId,
      }
    );
    return { child, passportData };
  });

  // Extract children who have coach notes
  const childrenWithNotes = useMemo(
    () =>
      childPassports
        .filter(({ passportData }) => {
          const notes = passportData?.coachNotes;
          return notes && notes.length > 0;
        })
        .map(({ child, passportData }) => ({
          player: child.player,
          notes: passportData?.coachNotes || [],
        })),
    [childPassports]
  );

  if (childrenWithNotes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Latest Coach Feedback
        </CardTitle>
        <CardDescription>
          Recent notes from your children's coaches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {childrenWithNotes.map(({ player, notes }) => (
            <div key={player._id}>
              {notes.slice(0, 3).map((note: any, idx: number) => (
                <div
                  className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50/50 p-4"
                  key={`${player._id}-${idx}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {player.firstName} {player.lastName}
                      </p>
                      {note.createdAt && (
                        <p className="text-muted-foreground text-xs">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {note.content || note}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
