"use client";

import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PlayerData {
  coachNotes?: string;
  parentNotes?: string;
  playerNotes?: string;
}

interface Props {
  player: PlayerData;
  isCoach: boolean;
}

export function NotesSection({ player, isCoach }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasNotes =
    player.coachNotes || player.parentNotes || player.playerNotes;

  if (!hasNotes) {
    return null;
  }

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notes & Feedback
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Coach Notes */}
            {player.coachNotes && (
              <NoteCard
                content={player.coachNotes}
                icon={<MessageSquare className="h-4 w-4" />}
                title="Coach Notes"
                variant="coach"
              />
            )}

            {/* Parent Notes */}
            {player.parentNotes && (
              <NoteCard
                content={player.parentNotes}
                icon={<Users className="h-4 w-4" />}
                title="Parent/Guardian Notes"
                variant="parent"
              />
            )}

            {/* Player Self-Assessment */}
            {player.playerNotes && (
              <NoteCard
                content={player.playerNotes}
                icon={<User className="h-4 w-4" />}
                title="Player Self-Assessment"
                variant="player"
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface NoteCardProps {
  title: string;
  content: string;
  icon: React.ReactNode;
  variant: "coach" | "parent" | "player";
}

function NoteCard({ title, content, icon, variant }: NoteCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "coach":
        return {
          border: "border-l-blue-500",
          bg: "bg-blue-50",
          badge: "bg-blue-100 text-blue-700",
        };
      case "parent":
        return {
          border: "border-l-green-500",
          bg: "bg-green-50",
          badge: "bg-green-100 text-green-700",
        };
      case "player":
        return {
          border: "border-l-purple-500",
          bg: "bg-purple-50",
          badge: "bg-purple-100 text-purple-700",
        };
    }
  };

  const classes = getVariantClasses();

  return (
    <Card className={`overflow-hidden border-l-4 ${classes.border}`}>
      <CardHeader className={`${classes.bg} pb-3`}>
        <div className="flex items-center gap-2">
          <Badge className={classes.badge} variant="secondary">
            <span className="flex items-center gap-1">
              {icon}
              {title}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="whitespace-pre-line text-sm">{content}</p>
      </CardContent>
    </Card>
  );
}
