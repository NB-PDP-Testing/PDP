"use client";

import { Suspense } from "react";
import Loader from "@/components/loader";
import { CoverageDashboard } from "./components/coverage-dashboard";

export default function CoverageCalibrationPage() {
  return (
    <Suspense fallback={<Loader />}>
      <CoverageDashboard />
    </Suspense>
  );
}
