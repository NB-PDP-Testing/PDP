"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";

type PresenceIndicatorsProps = {
  teamId: string;
  organizationId: string;
};

export function PresenceIndicators({
  teamId,
  organizationId,
}: PresenceIndicatorsProps) {
  const user = useCurrentUser();
  const presence = useQuery(api.models.teamCollaboration.getTeamPresence, {
    teamId: teamId as any, // Better Auth team ID
    organizationId,
  });

  if (!presence) {
    // Loading skeleton
    return (
      <div className="-space-x-2 flex">
        {[1, 2, 3].map((i) => (
          <Skeleton className="h-8 w-8 rounded-full" key={i} />
        ))}
      </div>
    );
  }

  // Filter out current user
  const otherUsers = presence.filter((p) => p.userId !== user?._id);

  if (otherUsers.length === 0) {
    return null;
  }

  const MAX_VISIBLE = 5;
  const visibleUsers = otherUsers.slice(0, MAX_VISIBLE);
  const remainingCount = otherUsers.length - MAX_VISIBLE;

  return (
    <TooltipProvider>
      <div className="-space-x-2 flex">
        {visibleUsers.map((p) => {
          const initials = p.userName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);

          // Format last active time
          const timeSinceActive = Date.now() - p.lastActive;
          const minutesAgo = Math.floor(timeSinceActive / 60_000);
          const lastActiveText =
            minutesAgo < 1
              ? "Just now"
              : minutesAgo === 1
                ? "1 minute ago"
                : `${minutesAgo} minutes ago`;

          return (
            <Tooltip key={p.userId}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarImage alt={p.userName} src={p.userAvatar} />
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status indicator ring */}
                  <div
                    className={`absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-background ${
                      p.status === "active"
                        ? "bg-green-500"
                        : p.status === "idle"
                          ? "bg-gray-400"
                          : "bg-gray-300"
                    }`}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" side="bottom">
                <div className="space-y-1">
                  <p className="font-medium">{p.userName}</p>
                  {p.currentView && (
                    <p className="text-muted-foreground text-xs">
                      Viewing: {p.currentView}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    Last active: {lastActiveText}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {remainingCount > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-xs">
            +{remainingCount}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
