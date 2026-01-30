import { Suspense } from "react";
import { PageSkeleton } from "@/components/loading";
import { VoiceNotesDashboard } from "./voice-notes-dashboard";

export default function VoiceNotesPage() {
  return (
    <Suspense fallback={<PageSkeleton showTabs variant="dashboard" />}>
      <VoiceNotesDashboard />
    </Suspense>
  );
}
