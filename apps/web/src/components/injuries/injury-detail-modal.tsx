"use client";

/**
 * InjuryDetailModal - Full injury detail view with recovery management
 * Phase 2 - Issue #261
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, FileText, Heart } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentList } from "./document-list";
import { DocumentUpload } from "./document-upload";
import type { Milestone } from "./milestone-tracker";
import { MilestoneTracker } from "./milestone-tracker";
import { RecoveryPlanCard, RecoveryPlanForm } from "./recovery-plan-form";
import type { ProgressUpdate } from "./recovery-timeline";
import { RecoveryTimeline } from "./recovery-timeline";

type Severity = "minor" | "moderate" | "severe" | "long_term";
type InjuryStatus = "active" | "recovering" | "cleared" | "healed";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bgColor: string }
> = {
  minor: { label: "Minor", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  moderate: {
    label: "Moderate",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  severe: { label: "Severe", color: "text-red-700", bgColor: "bg-red-100" },
  long_term: {
    label: "Long Term",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
};

const STATUS_CONFIG: Record<
  InjuryStatus,
  { label: string; color: string; bgColor: string }
> = {
  active: { label: "Active", color: "text-red-700", bgColor: "bg-red-100" },
  recovering: {
    label: "Recovering",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  cleared: {
    label: "Cleared",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  healed: { label: "Healed", color: "text-green-700", bgColor: "bg-green-100" },
};

interface Injury {
  _id: Id<"playerInjuries">;
  playerIdentityId: Id<"playerIdentities">;
  injuryType: string;
  bodyPart: string;
  side?: "left" | "right" | "both";
  dateOccurred: string;
  severity: string;
  status: string;
  description: string;
  treatment?: string;
  expectedReturn?: string;
  actualReturn?: string;
  // Phase 2 fields
  estimatedRecoveryDays?: number;
  recoveryPlanNotes?: string;
  milestones?: Array<{
    id: string;
    description: string;
    targetDate?: string;
    completedDate?: string;
    completedBy?: string;
    notes?: string;
    order: number;
  }>;
  medicalClearanceRequired?: boolean;
  medicalClearanceReceived?: boolean;
  medicalClearanceDate?: string;
  // Player info (populated from query)
  player?: {
    firstName: string;
    lastName: string;
  };
}

interface InjuryDetailModalProps {
  injury: Injury | null;
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: "guardian" | "coach" | "admin";
  canEdit?: boolean;
}

export function InjuryDetailModal({
  injury: injuryProp,
  open,
  onClose,
  userId,
  userName,
  userRole,
  canEdit = false,
}: InjuryDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query for real-time injury data (milestones update in real-time)
  const liveInjuryData = useQuery(
    api.models.playerInjuries.getInjuryById,
    injuryProp ? { injuryId: injuryProp._id } : "skip"
  );

  // Merge live data with prop data (prop has player info, live has updated milestones)
  const injury = liveInjuryData
    ? {
        ...liveInjuryData,
        player: injuryProp?.player, // Keep player info from prop
      }
    : injuryProp;

  // Queries
  const progressUpdates = useQuery(
    api.models.playerInjuries.getProgressUpdates,
    injury ? { injuryId: injury._id } : "skip"
  );

  // Mutations
  const completeMilestone = useMutation(
    api.models.playerInjuries.updateMilestone
  );
  const addMilestone = useMutation(api.models.playerInjuries.addMilestone);
  const removeMilestone = useMutation(
    api.models.playerInjuries.removeMilestone
  );

  // Handle milestone completion
  const handleCompleteMilestone = useCallback(
    async (milestoneId: string, notes?: string) => {
      if (!injury) {
        return;
      }
      setIsSubmitting(true);
      try {
        await completeMilestone({
          injuryId: injury._id,
          milestoneId,
          completedDate: new Date().toISOString().split("T")[0],
          notes,
          updatedBy: userId,
          updatedByName: userName,
          updatedByRole: userRole,
        });
        toast.success("Milestone completed");
      } catch (error) {
        console.error("Error completing milestone:", error);
        toast.error("Failed to complete milestone");
      } finally {
        setIsSubmitting(false);
      }
    },
    [injury, completeMilestone, userId, userName, userRole]
  );

  // Handle add milestone
  const handleAddMilestone = useCallback(
    async (description: string, targetDate?: string) => {
      if (!injury) {
        return;
      }
      setIsSubmitting(true);
      try {
        await addMilestone({
          injuryId: injury._id,
          description,
          targetDate,
          updatedBy: userId,
          updatedByName: userName,
          updatedByRole: userRole,
        });
        toast.success("Milestone added");
      } catch (error) {
        console.error("Error adding milestone:", error);
        toast.error("Failed to add milestone");
      } finally {
        setIsSubmitting(false);
      }
    },
    [injury, addMilestone, userId, userName, userRole]
  );

  // Handle remove milestone
  const handleRemoveMilestone = useCallback(
    async (milestoneId: string) => {
      if (!injury) {
        return;
      }
      setIsSubmitting(true);
      try {
        await removeMilestone({
          injuryId: injury._id,
          milestoneId,
        });
        toast.success("Milestone removed");
      } catch (error) {
        console.error("Error removing milestone:", error);
        toast.error("Failed to remove milestone");
      } finally {
        setIsSubmitting(false);
      }
    },
    [injury, removeMilestone]
  );

  if (!injury) {
    return null;
  }

  const severity = injury.severity as Severity;
  const status = injury.status as InjuryStatus;
  const milestones: Milestone[] =
    injury.milestones?.map((m) => ({
      id: m.id,
      description: m.description,
      targetDate: m.targetDate,
      completedDate: m.completedDate,
      completedBy: m.completedBy,
      notes: m.notes,
      order: m.order,
    })) || [];

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Heart className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {injury.bodyPart}
                  {injury.side && ` (${injury.side})`} - {injury.injuryType}
                </DialogTitle>
                {injury.player && (
                  <p className="text-muted-foreground text-sm">
                    {injury.player.firstName} {injury.player.lastName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={`${SEVERITY_CONFIG[severity].bgColor} ${SEVERITY_CONFIG[severity].color}`}
              >
                {SEVERITY_CONFIG[severity].label}
              </Badge>
              <Badge
                className={`${STATUS_CONFIG[status].bgColor} ${STATUS_CONFIG[status].color}`}
              >
                {STATUS_CONFIG[status].label}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          className="flex flex-1 flex-col overflow-hidden"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="recovery">Recovery</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="mr-1 h-4 w-4" />
              Docs
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="p-1">
              {/* Overview Tab */}
              <TabsContent className="mt-0 space-y-4" value="overview">
                {/* Injury Details */}
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="font-semibold">Injury Details</h3>
                  <p className="text-sm">{injury.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Date Occurred</p>
                      <p className="font-medium">{injury.dateOccurred}</p>
                    </div>
                    {injury.expectedReturn && (
                      <div>
                        <p className="text-muted-foreground">Expected Return</p>
                        <p className="font-medium">{injury.expectedReturn}</p>
                      </div>
                    )}
                    {injury.actualReturn && (
                      <div>
                        <p className="text-muted-foreground">Actual Return</p>
                        <p className="font-medium">{injury.actualReturn}</p>
                      </div>
                    )}
                    {injury.treatment && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Treatment</p>
                        <p className="font-medium">{injury.treatment}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recovery Plan Summary */}
                <RecoveryPlanCard
                  estimatedRecoveryDays={injury.estimatedRecoveryDays}
                  expectedReturn={injury.expectedReturn}
                  medicalClearanceReceived={injury.medicalClearanceReceived}
                  medicalClearanceRequired={injury.medicalClearanceRequired}
                  recoveryPlanNotes={injury.recoveryPlanNotes}
                />

                {/* Medical Clearance Alert */}
                {injury.medicalClearanceRequired &&
                  !injury.medicalClearanceReceived && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800">
                          Medical Clearance Required
                        </p>
                        <p className="text-amber-700 text-sm">
                          This player requires medical clearance before
                          returning to play.
                        </p>
                      </div>
                    </div>
                  )}
              </TabsContent>

              {/* Recovery Tab */}
              <TabsContent className="mt-0 space-y-4" value="recovery">
                {/* Recovery Plan Form (Coaches) or Card (Parents) */}
                {canEdit ? (
                  <div className="flex justify-end">
                    <RecoveryPlanForm
                      existingPlan={{
                        estimatedRecoveryDays: injury.estimatedRecoveryDays,
                        recoveryPlanNotes: injury.recoveryPlanNotes,
                        milestones: injury.milestones,
                        medicalClearanceRequired:
                          injury.medicalClearanceRequired,
                      }}
                      injuryId={injury._id}
                      updatedBy={userId}
                      updatedByName={userName}
                      updatedByRole={userRole}
                    />
                  </div>
                ) : (
                  <RecoveryPlanCard
                    estimatedRecoveryDays={injury.estimatedRecoveryDays}
                    expectedReturn={injury.expectedReturn}
                    medicalClearanceReceived={injury.medicalClearanceReceived}
                    medicalClearanceRequired={injury.medicalClearanceRequired}
                    recoveryPlanNotes={injury.recoveryPlanNotes}
                  />
                )}

                {/* Milestone Tracker */}
                <MilestoneTracker
                  canComplete={canEdit || userRole === "guardian"}
                  canEdit={canEdit}
                  isLoading={isSubmitting}
                  milestones={milestones}
                  onAdd={canEdit ? handleAddMilestone : undefined}
                  onComplete={handleCompleteMilestone}
                  onRemove={canEdit ? handleRemoveMilestone : undefined}
                />
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent className="mt-0" value="timeline">
                <RecoveryTimeline
                  expectedReturn={injury.expectedReturn}
                  injuryDate={injury.dateOccurred}
                  isLoading={progressUpdates === undefined}
                  updates={(progressUpdates as ProgressUpdate[]) || []}
                />
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent className="mt-0 space-y-4" value="documents">
                <div className="flex justify-end">
                  <DocumentUpload
                    injuryId={injury._id}
                    uploadedBy={userId}
                    uploadedByName={userName}
                    uploadedByRole={userRole}
                  />
                </div>
                <DocumentList
                  canDelete={true}
                  injuryId={injury._id}
                  userId={userId}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
