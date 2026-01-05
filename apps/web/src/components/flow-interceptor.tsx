"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FlowBanner } from "./flow-banner";
import { FlowModal } from "./flow-modal";
import { FlowPage } from "./flow-page";

interface FlowInterceptorProps {
  children: React.ReactNode;
}

export function FlowInterceptor({ children }: FlowInterceptorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeFlows = useQuery(api.models.flows.getActiveFlowsForUser);
  const startFlow = useMutation(api.models.flows.startFlow);
  const [currentFlow, setCurrentFlow] = useState<any>(null);

  // Extract organization ID from path (e.g., /orgs/123/...)
  const extractOrgIdFromPath = (path: string): string | null => {
    const match = path.match(/\/orgs\/([^/]+)/);
    return match ? match[1] : null;
  };

  const orgId = extractOrgIdFromPath(pathname);

  // Get organization-specific flows if viewing an org
  const shouldFetchOrgFlows = orgId && orgId !== "current";
  const orgFlows = useQuery(
    shouldFetchOrgFlows
      ? api.models.flows.getOrganizationFlows
      : ("skip" as any),
    shouldFetchOrgFlows ? { organizationId: orgId } : ("skip" as any)
  );

  useEffect(() => {
    // Combine platform and org flows
    const allFlows = [...(activeFlows || []), ...(orgFlows || [])];

    if (allFlows.length === 0) {
      setCurrentFlow(null);
      return;
    }

    // Get the highest priority flow
    const flow = allFlows[0];

    // Skip if we're already in a flow route
    if (pathname.startsWith("/flow/") || pathname.startsWith("/setup/")) {
      return;
    }

    // Handle blocking flows
    if (flow.priority === "blocking") {
      // Start the flow if not already started
      if (!flow.progress) {
        startFlow({ flowId: flow._id });
      }

      // Redirect to flow page
      const firstStep = flow.steps[0];
      if (firstStep.type === "page") {
        router.push(`/flow/${flow._id}/${firstStep.id}` as Route);
        return;
      }
    }

    setCurrentFlow(flow);
  }, [activeFlows, orgFlows, pathname, router, startFlow]);

  // Render flow based on type
  if (!currentFlow) {
    return <>{children}</>;
  }

  const currentStep =
    currentFlow.steps.find(
      (step: any) => step.id === currentFlow.progress?.currentStepId
    ) || currentFlow.steps[0];

  switch (currentStep.type) {
    case "modal":
      return (
        <>
          {children}
          <FlowModal flow={currentFlow} step={currentStep} />
        </>
      );

    case "banner":
      return (
        <>
          <FlowBanner flow={currentFlow} step={currentStep} />
          {children}
        </>
      );

    case "page":
      return <FlowPage flow={currentFlow} step={currentStep} />;

    default:
      return <>{children}</>;
  }
}
