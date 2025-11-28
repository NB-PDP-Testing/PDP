import { Suspense } from "react";
import Loader from "@/components/loader";
import { CoachDashboard } from "./coach-dashboard";

export default function CoachPage() {
  return (
    <Suspense fallback={<Loader />}>
      <CoachDashboard />
    </Suspense>
  );
}
