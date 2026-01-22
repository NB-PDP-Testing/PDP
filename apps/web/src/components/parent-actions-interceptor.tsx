"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePendingParentActions } from "@/hooks/use-pending-parent-actions";
import { useSession } from "@/lib/auth-client";
import { BatchedParentActionsModal } from "./batched-parent-actions-modal";
import { ParentActionsPersistentBanner } from "./parent-actions-persistent-banner";
import { ProfileCompletionChecklist } from "./profile-completion-checklist";

const SESSION_STORAGE_KEY = "parent-actions-dismissed";
const REMIND_LATER_KEY = "parent-actions-remind-later";

export function ParentActionsInterceptor() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const {
    pendingActions,
    hasPendingActions,
    shouldShowModal,
    shouldShowBanner,
    isLoading,
  } = usePendingParentActions();

  const [modalOpen, setModalOpen] = useState(false);
  const [profileChecklistOpen, setProfileChecklistOpen] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  // Check if dismissed this session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY) === "true";
      setSessionDismissed(dismissed);
    }
  }, []);

  // Check if we should show modal
  useEffect(() => {
    if (
      !isLoading &&
      userId &&
      shouldShowModal &&
      !sessionDismissed &&
      hasPendingActions
    ) {
      // Check if "remind later" is active
      const remindLaterTime = localStorage.getItem(REMIND_LATER_KEY);
      if (remindLaterTime) {
        const reminderTime = Number.parseInt(remindLaterTime, 10);
        if (Date.now() < reminderTime) {
          // Still in "remind later" period
          return;
        }
        // Expired, clear it
        localStorage.removeItem(REMIND_LATER_KEY);
      }

      setModalOpen(true);
    }
  }, [isLoading, userId, shouldShowModal, sessionDismissed, hasPendingActions]);

  const handleModalClose = () => {
    setModalOpen(false);
    setSessionDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    }
  };

  const handleComplete = () => {
    setModalOpen(false);
    // Show profile completion checklist if there are incomplete profiles
    if (pendingActions && pendingActions.incompleteProfiles.length > 0) {
      setProfileChecklistOpen(true);
    }
    // Clear session dismissal so it can be shown again if needed
    setSessionDismissed(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const handleBannerReviewNow = () => {
    setModalOpen(true);
  };

  const handleBannerRemindLater = () => {
    // Hide banner for 24 hours
    const remindAt = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(REMIND_LATER_KEY, remindAt.toString());
  };

  const handleBannerDismiss = () => {
    // Dismiss until next login (handled by sessionStorage)
    setSessionDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    }
  };

  const handleProfileChecklistSkip = () => {
    setProfileChecklistOpen(false);
    // TODO: Show banner reminder on parent dashboard
  };

  const handleProfileChecklistComplete = () => {
    setProfileChecklistOpen(false);
  };

  // Calculate pending count for banner
  const pendingCount = pendingActions
    ? pendingActions.unclaimedIdentities.reduce(
        (sum, id) => sum + id.linkedChildren.length,
        0
      ) + pendingActions.newChildAssignments.length
    : 0;

  // Don't render anything if no session
  if (!userId) {
    return null;
  }

  return (
    <>
      {/* Main Modal */}
      {modalOpen && pendingActions && (
        <BatchedParentActionsModal
          isOpen={modalOpen}
          onClose={handleModalClose}
          onComplete={handleComplete}
          pendingActions={pendingActions}
          userId={userId}
        />
      )}

      {/* Persistent Banner (shows after 3 dismissals) */}
      {!isLoading &&
        shouldShowBanner &&
        !sessionDismissed &&
        !modalOpen &&
        pendingCount > 0 && (
          <div className="fixed top-0 right-0 left-0 z-50 p-4">
            <ParentActionsPersistentBanner
              onDismiss={handleBannerDismiss}
              onRemindLater={handleBannerRemindLater}
              onReviewNow={handleBannerReviewNow}
              pendingCount={pendingCount}
            />
          </div>
        )}

      {/* Profile Completion Checklist */}
      <Dialog
        onOpenChange={setProfileChecklistOpen}
        open={profileChecklistOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          {pendingActions && pendingActions.incompleteProfiles.length > 0 && (
            <ProfileCompletionChecklist
              items={[
                {
                  id: "emergency",
                  label: "Emergency Contacts",
                  description: "Add at least 2 emergency contacts per child",
                  childrenCount: pendingActions.incompleteProfiles.filter((p) =>
                    p.requiredFields.includes("emergencyContact")
                  ).length,
                  completed: false,
                },
                {
                  id: "medical",
                  label: "Medical Information",
                  description: "Add allergies, medications, and conditions",
                  childrenCount: pendingActions.incompleteProfiles.filter((p) =>
                    p.requiredFields.includes("medicalInfo")
                  ).length,
                  completed: false,
                },
              ]}
              onComplete={handleProfileChecklistComplete}
              onSkip={handleProfileChecklistSkip}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
