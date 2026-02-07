"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ChevronRight, UserSearch } from "lucide-react";
import type * as NextTypes from "next";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

type AppRoute = NextTypes.Route;

type DisambiguationBannerProps = {
  orgId: string;
};

export function DisambiguationBanner({ orgId }: DisambiguationBannerProps) {
  const router = useRouter();
  const queue = useQuery(
    api.models.voiceNoteEntityResolutions.getDisambiguationQueue,
    { organizationId: orgId, limit: 50 }
  );

  if (!queue || queue.length === 0) {
    return null;
  }

  // Group by artifactId to get unique artifact count
  const artifactIds = new Set(queue.map((r) => r.artifactId));
  const uniqueNames = new Set(queue.map((r) => r.rawText.toLowerCase().trim()));

  // Navigate to the first artifact with disambiguations
  const firstArtifactId = queue[0].artifactId;
  const disambiguationUrl = `/orgs/${orgId}/coach/voice-notes/disambiguation/${firstArtifactId}`;

  return (
    <button
      className="block w-full text-left"
      onClick={() => router.push(disambiguationUrl as AppRoute)}
      type="button"
    >
      <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 transition-colors hover:bg-orange-100">
        <UserSearch className="h-5 w-5 shrink-0 text-orange-600" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-orange-900 text-sm">
            Players to identify
          </p>
          <p className="text-orange-700 text-xs">
            {uniqueNames.size} name{uniqueNames.size > 1 ? "s" : ""} across{" "}
            {artifactIds.size} voice note{artifactIds.size > 1 ? "s" : ""}
          </p>
        </div>
        <Badge className="bg-orange-200 text-orange-800" variant="secondary">
          {queue.length}
        </Badge>
        <ChevronRight className="h-4 w-4 shrink-0 text-orange-400" />
      </div>
    </button>
  );
}
