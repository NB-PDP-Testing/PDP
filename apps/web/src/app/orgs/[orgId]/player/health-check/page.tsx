"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  MessageSquare,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChildAccess } from "@/hooks/use-child-access";
import { authClient } from "@/lib/auth-client";
import { WellnessTrendCharts } from "./wellness-trend-charts";

// ============================================================
// Constants
// ============================================================

const EMOJI_SCALE = [
  { value: 1, emoji: "😢", label: "Very Poor", color: "#ef4444" },
  { value: 2, emoji: "😟", label: "Poor", color: "#f97316" },
  { value: 3, emoji: "😐", label: "Neutral", color: "#eab308" },
  { value: 4, emoji: "🙂", label: "Good", color: "#86efac" },
  { value: 5, emoji: "😁", label: "Great", color: "#22c55e" },
];

const CORE_DIMENSIONS = [
  {
    key: "sleepQuality",
    label: "Sleep Quality",
    question: "How rested do you feel today?",
  },
  { key: "energyLevel", label: "Energy", question: "How's your energy level?" },
  { key: "mood", label: "Mood", question: "How are you feeling emotionally?" },
  {
    key: "physicalFeeling",
    label: "Physical Feeling",
    question: "How does your body feel overall?",
  },
  {
    key: "motivation",
    label: "Motivation",
    question: "How motivated are you for training?",
  },
] as const;

const ALL_DIMENSIONS = [...CORE_DIMENSIONS];

const CYCLE_PHASES = [
  { key: "menstruation", label: "Menstruation", sublabel: "Days 1–5" },
  { key: "early_follicular", label: "Early Follicular", sublabel: "Days 6–9" },
  { key: "ovulation", label: "Ovulation", sublabel: "Days 10–14" },
  { key: "early_luteal", label: "Early Luteal", sublabel: "Days 15–21" },
  { key: "late_luteal", label: "Late Luteal", sublabel: "Days 22–28" },
] as const;

type CyclePhaseKey = (typeof CYCLE_PHASES)[number]["key"];
type DimensionValues = Partial<Record<string, number>>;

// ============================================================
// IndexedDB helpers
// ============================================================

const IDB_DB_NAME = "playerarc-wellness";
const IDB_STORE_NAME = "pending-checkins";

async function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePendingCheckin(
  key: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    const store = tx.objectStore(IDB_STORE_NAME);
    store.put({ key, ...data });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingCheckin(
  key: string
): Promise<Record<string, unknown> | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readonly");
    const store = tx.objectStore(IDB_STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function deletePendingCheckin(key: string): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    const store = tx.objectStore(IDB_STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================================
// GDPR Consent Modal
// ============================================================

function GdprConsentModal({
  open,
  onConsent,
  onSkip,
}: {
  open: boolean;
  onConsent: () => void;
  onSkip: () => void;
}) {
  const [checked, setChecked] = useState(false);

  // Reset checkbox when modal reopens
  useEffect(() => {
    if (open) {
      setChecked(false);
    }
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Menstrual Cycle Phase Tracking</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                PlayerARC can optionally record your menstrual cycle phase
                alongside your wellness check-in to help identify patterns in
                your performance and recovery.
              </p>
              <p>
                <strong>What we collect:</strong> Cycle phase only (one of five
                phase labels). We do not collect detailed menstrual health data.
              </p>
              <p>
                <strong>Who can see it:</strong> You and your organisation's
                medical/admin staff only. This data is{" "}
                <strong>never shared with coaches</strong>.
              </p>
              <p>
                <strong>How long we keep it:</strong> Up to 18 months from the
                date of submission.
              </p>
              <p>
                <strong>Your rights:</strong> You can withdraw consent at any
                time in Settings → Privacy. Withdrawal permanently deletes all
                your stored cycle phase data.
              </p>
              <p className="text-muted-foreground text-xs">
                This data is classified as Special Category health data under
                GDPR Article 9.{" "}
                <a className="underline" href="/privacy-policy">
                  Privacy Policy
                </a>
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox
            checked={checked}
            id="cycle-consent-checkbox"
            onCheckedChange={(val) => setChecked(val === true)}
          />
          <label
            className="cursor-pointer text-sm leading-relaxed"
            htmlFor="cycle-consent-checkbox"
          >
            I consent to PlayerARC storing my menstrual cycle phase data for
            sports performance analysis. I can withdraw this consent at any
            time.
          </label>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            onClick={onSkip}
            variant="outline"
          >
            Skip / No Thanks
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={!checked}
            onClick={onConsent}
          >
            I Consent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Channel Source Badge
// ============================================================

type HealthCheckSource =
  | "app"
  | "whatsapp_flows"
  | "whatsapp_conversational"
  | "sms"
  | null
  | undefined;

function SourceBadge({ source }: { source: HealthCheckSource }) {
  if (!source || source === "app") {
    return null;
  }
  if (source === "whatsapp_flows") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-800 text-xs"
        title="Via WhatsApp"
      >
        <MessageSquare className="h-3 w-3" />
        Via WhatsApp
      </span>
    );
  }
  if (source === "whatsapp_conversational") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-800 text-xs"
        title="Via WhatsApp chat"
      >
        <MessageSquare className="h-3 w-3" />
        Via WhatsApp chat
      </span>
    );
  }
  // sms
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 text-xs"
      title="Via SMS"
    >
      <Smartphone className="h-3 w-3" />
      Via SMS
    </span>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function PlayerHealthCheckPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const userEmail = session?.user?.email;

  // Child access check for wellness gating (Phase 7)
  const { isChildAccount, toggles } = useChildAccess(orgId);

  // Player identity lookup
  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  // Today's date
  const today = new Date().toISOString().split("T")[0];

  // Wellness data queries
  const wellnessSettings = useQuery(
    api.models.playerHealthChecks.getWellnessSettings,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  const todayCheck = useQuery(
    api.models.playerHealthChecks.getTodayHealthCheck,
    playerIdentity?._id
      ? {
          playerIdentityId: playerIdentity._id,
          checkDate: today,
        }
      : "skip"
  );

  const wellnessHistory = useQuery(
    api.models.playerHealthChecks.getWellnessHistory,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id, days: 30 }
      : "skip"
  );

  const cycleConsent = useQuery(
    api.models.playerHealthChecks.getCycleTrackingConsent,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  // AI wellness insight (US-P4-010)
  const latestInsight = useQuery(
    api.models.playerHealthChecks.getLatestWellnessInsight,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  const checkInCount = useQuery(
    api.models.playerHealthChecks.getWellnessCheckInCount,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  // Mutations
  const submitCheck = useMutation(
    api.models.playerHealthChecks.submitDailyHealthCheck
  );
  const updateCheck = useMutation(
    api.models.playerHealthChecks.updateDailyHealthCheck
  );
  const giveCycleConsent = useMutation(
    api.models.playerHealthChecks.giveCycleTrackingConsent
  );

  // Form state
  const [dimensionValues, setDimensionValues] = useState<DimensionValues>({});
  const [selectedCyclePhase, setSelectedCyclePhase] = useState<
    CyclePhaseKey | undefined
  >();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [cycleDeclined, setCycleDeclined] = useState(false);
  const [insightOpen, setInsightOpen] = useState(true);
  const pendingSyncKey = useRef<string | null>(null);

  // Determine if cycle phase section should show
  const showCyclePhase = (() => {
    if (!playerIdentity) {
      return false;
    }
    if (playerIdentity.gender !== "female") {
      return false;
    }
    if (!playerIdentity.dateOfBirth) {
      return false;
    }
    if (cycleDeclined) {
      return false;
    }
    const dob = new Date(playerIdentity.dateOfBirth);
    const ageDiff = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return age >= 18;
  })();

  const hasCycleConsent =
    cycleConsent !== undefined &&
    cycleConsent !== null &&
    !cycleConsent.withdrawnAt;

  // Populate form from existing check
  useEffect(() => {
    if (todayCheck == null) {
      return;
    }
    const vals: DimensionValues = {};
    for (const dim of ALL_DIMENSIONS) {
      const v = todayCheck[dim.key as keyof typeof todayCheck];
      if (typeof v === "number") {
        vals[dim.key] = v;
      }
    }
    setDimensionValues(vals);
    if (todayCheck.cyclePhase) {
      setSelectedCyclePhase(todayCheck.cyclePhase as CyclePhaseKey);
    }
  }, [todayCheck]);

  // Enabled dimensions
  const enabledDimensions = wellnessSettings?.enabledDimensions ?? [
    "sleepQuality",
    "energyLevel",
    "mood",
    "physicalFeeling",
    "motivation",
  ];

  // Visible dimensions in order
  const visibleDimensions = ALL_DIMENSIONS.filter((d) =>
    enabledDimensions.includes(d.key)
  );

  // Submit validation
  const allAnswered = visibleDimensions.every(
    (d) => dimensionValues[d.key] !== undefined
  );

  // Compute streak from history
  const computeStreak = useCallback(() => {
    if (!wellnessHistory) {
      return 0;
    }
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 30; i += 1) {
      const dateStr = d.toISOString().split("T")[0];
      const found = wellnessHistory.find((h) => h.checkDate === dateStr);
      if (!found) {
        break;
      }
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, [wellnessHistory]);

  // Monitor online/offline
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      // Auto-sync if there's a pending check-in
      if (pendingSyncKey.current) {
        syncPendingCheckin(pendingSyncKey.current);
      }
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncPendingCheckin = async (key: string) => {
    try {
      const data = await getPendingCheckin(key);
      if (!data) {
        return;
      }
      await submitCheck({
        playerIdentityId: data.playerIdentityId as Id<"playerIdentities">,
        organizationId: data.organizationId as string,
        checkDate: data.checkDate as string,
        dimensionValues: data.dimensionValues as Record<string, number>,
        enabledDimensions: data.enabledDimensions as string[],
        cyclePhase: data.cyclePhase as CyclePhaseKey | undefined,
        notes: data.notes as string | undefined,
        submittedOffline: true,
        deviceSubmittedAt: data.deviceSubmittedAt as number,
      });
      await deletePendingCheckin(key);
      pendingSyncKey.current = null;
      toast.success("Check-in synced ✓");
    } catch {
      // Sync will be retried on next 'online' event
    }
  };

  const handleCyclePhaseTap = (phase: CyclePhaseKey) => {
    if (!hasCycleConsent) {
      setShowGdprModal(true);
      return;
    }
    setSelectedCyclePhase((prev) => (prev === phase ? undefined : phase));
  };

  const handleGdprConsent = async () => {
    if (!playerIdentity?._id) {
      return;
    }
    try {
      await giveCycleConsent({
        playerIdentityId: playerIdentity._id,
        organizationId: orgId,
      });
      setShowGdprModal(false);
    } catch {
      toast.error("Failed to record consent");
    }
  };

  const handleGdprSkip = () => {
    setShowGdprModal(false);
    setCycleDeclined(true);
  };

  const handleSubmit = async () => {
    if (!(playerIdentity?._id && allAnswered)) {
      return;
    }
    setIsSubmitting(true);

    const vals: Record<string, number | undefined> = {};
    for (const dim of visibleDimensions) {
      vals[dim.key] = dimensionValues[dim.key];
    }

    try {
      if (!navigator.onLine) {
        // Store offline
        const key = `${orgId}_${playerIdentity._id}_${today}`;
        pendingSyncKey.current = key;
        await savePendingCheckin(key, {
          playerIdentityId: playerIdentity._id,
          organizationId: orgId,
          checkDate: today,
          dimensionValues: vals,
          enabledDimensions,
          cyclePhase: selectedCyclePhase,
          deviceSubmittedAt: Date.now(),
        });
        toast.info(
          "No connection — your check-in is saved and will sync when you're back online."
        );
        return;
      }

      if (todayCheck) {
        // Update existing
        await updateCheck({
          checkId: todayCheck._id,
          dimensionValues: vals,
          cyclePhase: selectedCyclePhase,
        });
        toast.success("Wellness check updated ✓");
      } else {
        // Submit new
        await submitCheck({
          playerIdentityId: playerIdentity._id,
          organizationId: orgId,
          checkDate: today,
          dimensionValues: vals,
          enabledDimensions,
          cyclePhase: selectedCyclePhase,
        });
        const streak = computeStreak() + 1;
        toast.success(
          streak > 1
            ? `Wellness check submitted ✓ — ${streak} days in a row 🔥`
            : "Wellness check submitted ✓"
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit wellness check");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // Loading / error states
  // ============================================================

  const isLoading =
    sessionLoading ||
    playerIdentity === undefined ||
    wellnessSettings === undefined ||
    todayCheck === undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto flex max-w-3xl items-center justify-center p-4 py-12 md:p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!playerIdentity) {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Player Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Your account is not linked to a player profile. Contact your club
              administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Child account gate: check includeWellnessAccess toggle (Phase 7)
  if (isChildAccount && !toggles?.includeWellnessAccess) {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Wellness Access Required</CardTitle>
            <CardDescription>
              Your parent hasn&apos;t enabled wellness check-ins for your
              account yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Ask your parent or guardian to enable wellness access from their
              Parent Portal settings. Once they&apos;ve done so, you&apos;ll be
              able to submit your daily wellness check-in here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Legacy under-18 gate (for youth players without a parentChildAuthorizations record)
  if (!(playerIdentity.dateOfBirth || isChildAccount)) {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Wellness Access Required</CardTitle>
            <CardDescription>
              Your parent needs to grant wellness access in your profile
              settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Ask your parent or guardian to enable wellness access from their
              Parent Portal settings. Once they&apos;ve done so, you&apos;ll be
              able to submit your daily wellness check-in here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  const dob = playerIdentity.dateOfBirth
    ? new Date(playerIdentity.dateOfBirth)
    : null;
  const ageDiff = dob ? Date.now() - dob.getTime() : 0;
  const ageDate = new Date(ageDiff);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);
  if (!isChildAccount && dob && age < 18) {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Wellness Access Required</CardTitle>
            <CardDescription>
              Your parent needs to grant wellness access in your profile
              settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Ask your parent or guardian to enable wellness access from their
              Parent Portal settings. Once they've done so, you'll be able to
              submit your daily wellness check-in here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAlreadySubmitted = todayCheck !== null;

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      {/* GDPR modal */}
      <GdprConsentModal
        onConsent={handleGdprConsent}
        onSkip={handleGdprSkip}
        open={showGdprModal}
      />

      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Daily Wellness</h1>
        <p className="text-muted-foreground text-sm">
          {isAlreadySubmitted
            ? "You've already checked in today. You can update your answers below."
            : "Rate how you're feeling today across each dimension."}
        </p>
      </div>

      {/* Offline banner */}
      {isOffline && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
          <WifiOff className="h-4 w-4 shrink-0" />
          <p>
            You&apos;re offline. Your check-in will be saved locally and synced
            when you&apos;re back online.
          </p>
        </div>
      )}

      {/* Already submitted indicator */}
      {isAlreadySubmitted && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p>Check-in submitted today. Edit your answers below if needed.</p>
        </div>
      )}

      {/* Dimension cards */}
      <div className="space-y-4">
        {visibleDimensions.map((dim) => {
          const selected = dimensionValues[dim.key];
          return (
            <Card key={dim.key}>
              <CardContent className="pt-5">
                <div className="mb-3">
                  <p
                    className="font-medium text-sm"
                    id={`dim-label-${dim.key}`}
                  >
                    {dim.question}
                  </p>
                </div>
                {/* WCAG 2.1 AA — radiogroup pattern (ARIA APG radio group) */}
                <div
                  aria-labelledby={`dim-label-${dim.key}`}
                  className="flex justify-between gap-1"
                  onKeyDown={(e) => {
                    const idx = EMOJI_SCALE.findIndex(
                      (s) => s.value === (selected ?? 0)
                    );
                    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                      e.preventDefault();
                      const next =
                        EMOJI_SCALE[Math.min(idx + 1, EMOJI_SCALE.length - 1)];
                      if (next) {
                        setDimensionValues((prev) => ({
                          ...prev,
                          [dim.key]: next.value,
                        }));
                      }
                    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault();
                      const prev = EMOJI_SCALE[Math.max(idx - 1, 0)];
                      if (prev) {
                        setDimensionValues((pv) => ({
                          ...pv,
                          [dim.key]: prev.value,
                        }));
                      }
                    }
                  }}
                  role="radiogroup"
                >
                  {EMOJI_SCALE.map((scale) => (
                    // biome-ignore lint/a11y/useSemanticElements: custom radio widget per WAI-ARIA APG radio group pattern
                    <button
                      aria-checked={selected === scale.value}
                      aria-label={`${scale.label} — ${scale.value} out of 5`}
                      className="flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      key={scale.value}
                      onClick={() =>
                        setDimensionValues((prev) => ({
                          ...prev,
                          [dim.key]: scale.value,
                        }))
                      }
                      role="radio"
                      style={{
                        borderColor:
                          selected === scale.value
                            ? scale.color
                            : "transparent",
                        backgroundColor:
                          selected === scale.value
                            ? `${scale.color}20`
                            : "transparent",
                        opacity:
                          selected !== undefined && selected !== scale.value
                            ? 0.4
                            : 1,
                      }}
                      tabIndex={
                        selected === scale.value ||
                        (selected === undefined && scale.value === 1)
                          ? 0
                          : -1
                      }
                      type="button"
                    >
                      <span aria-hidden="true" className="text-xl leading-none">
                        {scale.emoji}
                      </span>
                      <span className="sr-only">{scale.label}</span>
                      <span
                        aria-hidden="true"
                        className="hidden text-muted-foreground text-xs sm:block"
                      >
                        {scale.value}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cycle phase section — female players only, age >= 18 */}
      {showCyclePhase && (
        <Card>
          <CardContent className="pt-5">
            <div className="mb-3">
              <p className="font-medium text-sm">Cycle Phase</p>
              <p className="text-muted-foreground text-xs">
                Optional — you don&apos;t have to answer this
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CYCLE_PHASES.map((phase) => (
                <button
                  className="flex min-h-[44px] flex-col items-center justify-center rounded-lg border-2 px-3 py-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={cycleConsent === undefined}
                  key={phase.key}
                  onClick={() => handleCyclePhaseTap(phase.key)}
                  style={{
                    borderColor:
                      selectedCyclePhase === phase.key
                        ? "hsl(var(--primary))"
                        : "hsl(var(--border))",
                    backgroundColor:
                      selectedCyclePhase === phase.key
                        ? "hsl(var(--primary) / 0.1)"
                        : "transparent",
                  }}
                  type="button"
                >
                  <span className="font-medium text-sm">{phase.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {phase.sublabel}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit / Update button */}
      <Button
        className="w-full"
        disabled={!allAnswered || isSubmitting}
        onClick={handleSubmit}
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isAlreadySubmitted ? "Updating..." : "Submitting..."}
          </>
        ) : isAlreadySubmitted ? (
          "Update Check-In"
        ) : (
          "Submit Check-In"
        )}
      </Button>

      {!allAnswered && (
        <p className="text-center text-muted-foreground text-xs">
          Answer all dimensions above to submit.
        </p>
      )}

      {/* AI Wellness Insight (US-P4-010) — collapsible panel above trend charts */}
      {(checkInCount !== undefined || latestInsight) && (
        <Collapsible onOpenChange={setInsightOpen} open={insightOpen}>
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-900 text-sm transition-colors hover:bg-blue-100"
              type="button"
            >
              <span className="font-medium">💡 Latest Insight</span>
              <ChevronDown
                className="h-4 w-4 shrink-0 transition-transform"
                style={{ transform: insightOpen ? "rotate(180deg)" : "none" }}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-b-lg border border-blue-200 border-t-0 bg-blue-50 px-4 pb-3">
              {checkInCount !== undefined && checkInCount < 7 ? (
                <p className="pt-2 text-blue-900 text-sm">
                  Check in for {7 - checkInCount} more day
                  {7 - checkInCount !== 1 ? "s" : ""} to unlock personalised
                  insights.
                </p>
              ) : latestInsight ? (
                <div className="pt-2">
                  <p className="text-emerald-900 text-sm">
                    {latestInsight.insight}
                  </p>
                  <p className="mt-1 text-emerald-700 text-xs">
                    Generated by AI · Based on your last{" "}
                    {latestInsight.basedOnDays} check-ins
                  </p>
                </div>
              ) : (
                <p className="pt-2 text-blue-900 text-sm">
                  No insight available yet.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Recent Check-Ins with channel source badges */}
      {wellnessHistory && wellnessHistory.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-base">Recent Check-Ins</h2>
          <div className="space-y-1">
            {wellnessHistory.slice(0, 7).map((record) => {
              const scores: number[] = [];
              for (const dim of record.enabledDimensions) {
                const val = record[dim as keyof typeof record];
                if (typeof val === "number") {
                  scores.push(val);
                }
              }
              const avg =
                scores.length > 0
                  ? scores.reduce((a, b) => a + b, 0) / scores.length
                  : null;
              return (
                <div
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  key={record._id}
                >
                  <span className="text-muted-foreground">
                    {new Date(record.checkDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    {avg !== null && (
                      <span className="font-medium">
                        {(Math.round(avg * 10) / 10).toFixed(1)}/5
                      </span>
                    )}
                    <SourceBadge source={record.source} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trend Charts */}
      <WellnessTrendCharts
        enabledDimensions={enabledDimensions}
        playerIdentityId={playerIdentity._id}
      />
    </div>
  );
}
