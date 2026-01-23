"use client";

import { useQuery } from "convex/react";
import { InfoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { UXAnalyticsEvents, useAnalytics } from "@/lib/analytics";

interface AIModelInfoProps {
  orgId: string;
}

export function AIModelInfo({ orgId }: AIModelInfoProps) {
  const { useVoiceNotesAIModelDisplay } = useUXFeatureFlags();
  const { track } = useAnalytics();

  // Get AI config for voice features
  const transcriptionConfig = useQuery(
    api.models.aiModelConfig.getConfigForFeature,
    {
      feature: "voice_transcription",
      organizationId: orgId,
    }
  );

  const insightsConfig = useQuery(
    api.models.aiModelConfig.getConfigForFeature,
    {
      feature: "voice_insights",
      organizationId: orgId,
    }
  );

  // Don't show if feature flag is disabled
  if (!useVoiceNotesAIModelDisplay) {
    return null;
  }

  // Don't show until configs are loaded
  if (!(transcriptionConfig && insightsConfig)) {
    return null;
  }

  const handleInfoClick = () => {
    track(UXAnalyticsEvents.AI_MODEL_INFO_VIEWED, {
      transcriptionModel: transcriptionConfig.modelId,
      insightsModel: insightsConfig.modelId,
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={handleInfoClick}
            type="button"
          >
            <InfoIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI Models</span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm" side="bottom">
          <div className="space-y-2">
            <p className="font-medium text-sm">AI Models in Use</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <Badge className="shrink-0 text-xs" variant="outline">
                  Transcription
                </Badge>
                <div className="flex-1 text-xs">
                  <div className="font-medium">
                    {transcriptionConfig.modelId}
                  </div>
                  {transcriptionConfig.provider && (
                    <div className="text-muted-foreground">
                      {transcriptionConfig.provider}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="shrink-0 text-xs" variant="outline">
                  Insights
                </Badge>
                <div className="flex-1 text-xs">
                  <div className="font-medium">{insightsConfig.modelId}</div>
                  {insightsConfig.provider && (
                    <div className="text-muted-foreground">
                      {insightsConfig.provider}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {(transcriptionConfig.scope === "organization" ||
              insightsConfig.scope === "organization") && (
              <p className="border-t pt-2 text-muted-foreground text-xs">
                Using organization-specific configuration
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
