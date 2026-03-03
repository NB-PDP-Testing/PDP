"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Loader2, Share2, Trophy, User } from "lucide-react";
import type { Route } from "next";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { BenchmarkComparison } from "@/components/benchmark-comparison";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChildAccess } from "@/hooks/use-child-access";
import { authClient } from "@/lib/auth-client";
import { BasicInformationSection } from "../../players/[playerId]/components/basic-info-section";
import { EmergencyContactsSection } from "../../players/[playerId]/components/emergency-contacts-section";
import { GoalsSection } from "../../players/[playerId]/components/goals-section";
import { NotesSection } from "../../players/[playerId]/components/notes-section";
import { PositionsFitnessSection } from "../../players/[playerId]/components/positions-fitness-section";
import { SkillsSection } from "../../players/[playerId]/components/skills-section";

const SPORT_EMOJIS: Record<string, string> = {
  gaa: "🏐",
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

function MyPassportsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;
  const sportCodeParam = searchParams.get("sport");

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const { data: session } = authClient.useSession();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  // Child access check for assessments gating (Phase 7)
  const { isChildAccount, toggles } = useChildAccess(orgId);

  const userEmail = session?.user?.email;
  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  // Get all passports for tab list
  const allPassports = useQuery(
    api.models.sportPassports.getPassportsForPlayer,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id as Id<"playerIdentities"> }
      : "skip"
  );

  const activePassports =
    allPassports?.filter((p) => p.status === "active") ?? [];
  const activeSportCode =
    sportCodeParam || activePassports[0]?.sportCode || undefined;

  // Get full passport data for the selected sport
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

  const handleShare = async () => {
    setIsPdfGenerating(true);
    try {
      toast.info("PDF generation coming soon!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsPdfGenerating(false);
    }
  };

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

  // Child account: assessments access disabled by parent
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activePassports.map((p) => (
              <span
                className="rounded-full bg-white/20 px-2 py-0.5 font-medium text-xs"
                key={p._id}
              >
                {SPORT_EMOJIS[p.sportCode] ?? "🏅"}{" "}
                {formatSportName(p.sportCode)}
              </span>
            ))}
            <Button
              className="border-current/20 bg-current/20 hover:bg-current/30"
              disabled={isPdfGenerating}
              onClick={handleShare}
              variant="outline"
            >
              {isPdfGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share PDF
                </>
              )}
            </Button>
          </div>
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
  // Only render when this tab's sport matches the active sport data
  if (!playerData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If this tab is not the active sport, skip rendering its content
  if (tabSportCode && activeSportCode && tabSportCode !== activeSportCode) {
    return null;
  }

  return (
    <>
      <BasicInformationSection player={playerData as any} />

      {playerIdentity.playerType === "adult" && (
        <EmergencyContactsSection
          isEditable={true}
          playerIdentityId={playerIdentity._id}
          playerType="adult"
        />
      )}

      {"playerIdentityId" in playerData &&
        playerData.playerIdentityId &&
        playerData.sportCode && (
          <BenchmarkComparison
            ageGroup={(playerData as any).ageGroup}
            dateOfBirth={(playerData as any).dateOfBirth}
            playerId={playerData.playerIdentityId}
            showAllSkills={true}
            sportCode={playerData.sportCode}
          />
        )}

      <GoalsSection player={playerData as any} />

      <NotesSection isCoach={false} player={playerData as any} />

      <SkillsSection player={playerData as any} />

      <PositionsFitnessSection player={playerData as any} />
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
