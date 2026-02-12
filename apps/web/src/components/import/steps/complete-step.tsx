"use client";

import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  PartyPopper,
  Shield,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { WizardState } from "@/components/import/import-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ============================================================
// Types
// ============================================================

type CompleteStepProps = {
  organizationId: string;
  importResult: WizardState["importResult"];
};

// ============================================================
// Sub-components
// ============================================================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  if (value === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Icon className={`h-5 w-5 ${color}`} />
      <div>
        <p className="font-bold text-lg">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
    </div>
  );
}

function WhatNextCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href as Route}>
      <Card className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/30">
        <CardContent className="flex items-start gap-3 p-4">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-muted-foreground text-xs">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================================
// Main CompleteStep
// ============================================================

export default function CompleteStep({
  organizationId,
  importResult,
}: CompleteStepProps) {
  if (!importResult) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No import results available.
      </div>
    );
  }

  const totalImported =
    importResult.playersCreated + importResult.playersUpdated;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
            <PartyPopper className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Import Complete!</CardTitle>
          <CardDescription>
            Successfully processed {totalImported} player
            {totalImported !== 1 ? "s" : ""}.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Import Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            <StatCard
              color="text-green-600"
              icon={UserPlus}
              label="Players Created"
              value={importResult.playersCreated}
            />
            <StatCard
              color="text-blue-600"
              icon={Users}
              label="Players Updated"
              value={importResult.playersUpdated}
            />
            <StatCard
              color="text-amber-600"
              icon={Users}
              label="Players Skipped"
              value={importResult.playersSkipped}
            />
            <StatCard
              color="text-purple-600"
              icon={Shield}
              label="Guardians Created"
              value={importResult.guardiansCreated}
            />
            <StatCard
              color="text-indigo-600"
              icon={Shield}
              label="Guardians Linked"
              value={importResult.guardiansLinked}
            />
            <StatCard
              color="text-cyan-600"
              icon={CheckCircle2}
              label="Passports Created"
              value={importResult.passportsCreated}
            />
            <StatCard
              color="text-emerald-600"
              icon={BarChart3}
              label="Benchmarks Applied"
              value={importResult.benchmarksApplied}
            />
            <StatCard
              color="text-orange-600"
              icon={Users}
              label="Teams Created"
              value={importResult.teamsCreated}
            />
          </div>
        </CardContent>
      </Card>

      {/* What Next */}
      <div>
        <h2 className="mb-3 font-semibold text-lg">What Next?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <WhatNextCard
            description="Review and manage your team rosters"
            href={`/orgs/${organizationId}/admin/teams`}
            icon={Users}
            title="View Teams"
          />
          <WhatNextCard
            description="Import more players from another file"
            href={`/orgs/${organizationId}/import`}
            icon={Upload}
            title="Import More Players"
          />
          <WhatNextCard
            description="Set up skill assessments for imported players"
            href={`/orgs/${organizationId}/admin`}
            icon={BarChart3}
            title="Set Up Assessments"
          />
          <WhatNextCard
            description="Review player profiles and passport data"
            href={`/orgs/${organizationId}/admin`}
            icon={ClipboardList}
            title="Review Players"
          />
        </div>
      </div>

      {/* Return to Import */}
      <div className="flex justify-center pt-2">
        <Link href={`/orgs/${organizationId}/import` as Route}>
          <Button variant="outline">
            <Badge className="mr-2" variant="secondary">
              Done
            </Badge>
            Return to Import Page
          </Button>
        </Link>
      </div>
    </div>
  );
}
