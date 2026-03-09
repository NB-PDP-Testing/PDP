"use client";

import { Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/loading";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Card, CardContent } from "@/components/ui/card";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";
import { AIPracticeAssistant } from "../components/ai-practice-assistant";

function AIPracticeAssistantContent() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: session } = authClient.useSession();

  const { children: identityChildren, isLoading } = useGuardianChildrenInOrg(
    orgId,
    session?.user?.email
  );

  if (isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <div className="space-y-6">
      <OrgThemedGradient
        className="rounded-lg p-6 shadow-md"
        gradientTo="secondary"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-2xl md:text-3xl">
              AI Practice Assistant
            </h1>
            <p className="mt-1 text-sm opacity-90">
              Generate personalised home training plans for your children based
              on their skill ratings and areas for improvement.
            </p>
          </div>
        </div>
      </OrgThemedGradient>

      <Card>
        <CardContent className="p-0">
          {identityChildren.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">
                No children linked
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                Link your children's profiles to generate practice plans.
              </p>
            </div>
          ) : (
            <AIPracticeAssistant orgId={orgId} playerData={identityChildren} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AIPracticeAssistantPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <AIPracticeAssistantContent />
    </Suspense>
  );
}
