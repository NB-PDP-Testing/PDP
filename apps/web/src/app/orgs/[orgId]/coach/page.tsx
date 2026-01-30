import { Suspense } from "react";
import { PageSkeleton } from "@/components/loading";
import { CoachDashboard } from "./coach-dashboard";

export default function CoachPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <CoachDashboard />
    </Suspense>
  );
}
