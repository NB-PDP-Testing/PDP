"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Share2,
  Trophy,
  User,
} from "lucide-react";
import type { Route } from "next";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { BenchmarkComparison } from "@/components/benchmark-comparison";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChildAccess } from "@/hooks/use-child-access";
import { authClient } from "@/lib/auth-client";
import type { PassportPDFData } from "@/lib/pdf-generator";
import { BasicInformationSection } from "../../players/[playerId]/components/basic-info-section";
import { EmergencyContactsSection } from "../../players/[playerId]/components/emergency-contacts-section";
import { GoalsSection } from "../../players/[playerId]/components/goals-section";
import { NotesSection } from "../../players/[playerId]/components/notes-section";
import { PositionsFitnessSection } from "../../players/[playerId]/components/positions-fitness-section";
import { ShareModal } from "../../players/[playerId]/components/share-modal";
import { SkillsSection } from "../../players/[playerId]/components/skills-section";

const SPORT_EMOJIS: Record<string, string> = {
  gaa: "🏐",
  gaa_football: "🏐",
  soccer: "⚽",
  football: "🏈",
  basketball: "🏀",
  rugby: "🏉",
  hurling: "🏑",
  camogie: "🏑",
  hockey: "🏒",
  tennis: "🎾",
  athletics: "🏃",
};

function formatSportName(code: string) {
  return code.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Collapsible section wrapper
function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <button
            aria-label={collapsed ? "Expand section" : "Collapse section"}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            onClick={() => setCollapsed((c) => !c)}
            type="button"
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </CardHeader>
      {!collapsed && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function MyPassportsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;
  const sportCodeParam = searchParams.get("sport");

  const [showShareModal, setShowShareModal] = useState(false);

  const { data: session } = authClient.useSession();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  const { isChildAccount, toggles } = useChildAccess(orgId);

  const userEmail = session?.user?.email;
  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  const allPassports = useQuery(
    api.models.sportPassports.getPassportsForPlayer,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id as Id<"playerIdentities"> }
      : "skip"
  );

  const activePassports = allPassports
    ? Array.from(
        new Map(
          allPassports
            .filter((p) => p.status === "active")
            .map((p) => [p.sportCode, p])
        ).values()
      )
    : [];
  const activeSportCode =
    sportCodeParam || activePassports[0]?.sportCode || undefined;

  const playerData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    playerIdentity?._id
      ? {
          playerIdentityId: playerIdentity._id as Id<"playerIdentities">,
          organizationId: orgId,
          sportCode: activeSportCode || undefined,
        }
      : "skip"
  );

  const pdfData: PassportPDFData | null = useMemo(
    () =>
      playerData && playerIdentity
        ? {
            playerName: `${playerIdentity.firstName} ${playerIdentity.lastName}`,
            dateOfBirth: (playerData as any).dateOfBirth,
            ageGroup: (playerData as any).ageGroup,
            sport: (playerData as any).sportCode,
            organization: (playerData as any).organizationName,
            skills: (playerData as any).skills as
              | Record<string, number>
              | undefined,
            goals: (playerData as any).goals?.map((g: any) => ({
              title: g.title || g.description,
              status: g.status,
              targetDate: g.targetDate,
            })),
            notes: (playerData as any).notes?.map((n: any) => ({
              content: n.content || n.note,
              coachName: n.coachName || n.authorName,
              date:
                n.date ||
                new Date(n.createdAt || n._creationTime).toLocaleDateString(),
            })),
            overallScore: (playerData as any).overallScore,
            trainingAttendance: (playerData as any).trainingAttendance,
            matchAttendance: (playerData as any).matchAttendance,
          }
        : null,
    [playerData, playerIdentity]
  );

  if (playerIdentity === undefined || allPassports === undefined) {
    return (
      <div className="container mx-auto space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!playerIdentity) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Player Profile Not Linked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Your account hasn&apos;t been linked to a player profile yet.
              Contact your club administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isChildAccount && !toggles?.includeAssessments) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Card className="border-muted">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Trophy className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Passport Not Available</CardTitle>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Your parent hasn&apos;t enabled assessments for your account.
              </p>
            </CardContent>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Header */}
      <OrgThemedGradient
        className="rounded-lg p-6 shadow-lg"
        style={{ filter: "brightness(0.95)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Trophy className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-bold text-2xl md:text-3xl">My Passports</h1>
              <p className="opacity-80">
                {playerIdentity.firstName} {playerIdentity.lastName}
              </p>
              {activeOrganization && (
                <p className="text-sm opacity-60">{activeOrganization.name}</p>
              )}
              {activePassports.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {activePassports.map((p) => (
                    <span
                      className="rounded-full bg-white/20 px-2 py-0.5 font-medium text-xs"
                      key={p._id}
                    >
                      {SPORT_EMOJIS[p.sportCode] ?? "🏅"}{" "}
                      {formatSportName(p.sportCode)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button
            className="shrink-0 border-current/20 bg-current/20 hover:bg-current/30"
            disabled={!pdfData}
            onClick={() => setShowShareModal(true)}
            variant="outline"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share PDF
          </Button>
        </div>
      </OrgThemedGradient>

      {/* Multi-sport tabs or single-sport content */}
      {activePassports.length > 1 ? (
        <Tabs
          className="w-full"
          defaultValue={activeSportCode}
          onValueChange={(value) => {
            if (value !== activeSportCode) {
              router.push(
                `/orgs/${orgId}/player/passports?sport=${value}` as Route
              );
            }
          }}
        >
          <TabsList>
            {activePassports.map((passport) => (
              <TabsTrigger key={passport._id} value={passport.sportCode}>
                {SPORT_EMOJIS[passport.sportCode] ?? "🏅"}{" "}
                {formatSportName(passport.sportCode)}
              </TabsTrigger>
            ))}
          </TabsList>

          {activePassports.map((passport) => (
            <TabsContent
              className="space-y-4"
              key={passport._id}
              value={passport.sportCode}
            >
              <PassportSections
                activeSportCode={activeSportCode}
                orgId={orgId}
                playerData={playerData}
                playerIdentity={playerIdentity}
                tabSportCode={passport.sportCode}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-4">
          <PassportSections
            activeSportCode={activeSportCode}
            orgId={orgId}
            playerData={playerData}
            playerIdentity={playerIdentity}
            tabSportCode={activeSportCode}
          />
        </div>
      )}

      {/* Share Modal */}
      {pdfData && (
        <ShareModal
          onOpenChange={setShowShareModal}
          open={showShareModal}
          playerData={pdfData}
          playerName={`${playerIdentity.firstName} ${playerIdentity.lastName}`}
        />
      )}
    </div>
  );
}

type PassportSectionsProps = {
  playerData: any;
  playerIdentity: {
    _id: Id<"playerIdentities">;
    playerType?: string;
    firstName: string;
    lastName: string;
  };
  orgId: string;
  activeSportCode: string | undefined;
  tabSportCode: string | undefined;
};

function PassportSections({
  playerData,
  playerIdentity,
  activeSportCode,
  tabSportCode,
}: PassportSectionsProps) {
  if (!playerData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tabSportCode && activeSportCode && tabSportCode !== activeSportCode) {
    return null;
  }

  return (
    <>
      <CollapsibleSection title="Basic Information">
        <BasicInformationSection player={playerData as any} />
      </CollapsibleSection>

      {playerIdentity.playerType === "adult" && (
        <CollapsibleSection title="Emergency Contacts">
          <EmergencyContactsSection
            isEditable={true}
            playerIdentityId={playerIdentity._id}
            playerType="adult"
          />
        </CollapsibleSection>
      )}

      {"playerIdentityId" in playerData &&
        playerData.playerIdentityId &&
        playerData.sportCode && (
          <CollapsibleSection title="Benchmark Comparison">
            <BenchmarkComparison
              ageGroup={(playerData as any).ageGroup}
              dateOfBirth={(playerData as any).dateOfBirth}
              playerId={playerData.playerIdentityId}
              showAllSkills={true}
              sportCode={playerData.sportCode}
            />
          </CollapsibleSection>
        )}

      <CollapsibleSection title="Goals">
        <GoalsSection player={playerData as any} />
      </CollapsibleSection>

      <CollapsibleSection title="Coach Notes">
        <NotesSection isCoach={false} player={playerData as any} />
      </CollapsibleSection>

      <CollapsibleSection title="Skills">
        <SkillsSection player={playerData as any} />
      </CollapsibleSection>

      <CollapsibleSection title="Positions & Fitness">
        <PositionsFitnessSection player={playerData as any} />
      </CollapsibleSection>
    </>
  );
}

export default function MyPassportsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto space-y-6 p-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      }
    >
      <MyPassportsContent />
    </Suspense>
  );
}
