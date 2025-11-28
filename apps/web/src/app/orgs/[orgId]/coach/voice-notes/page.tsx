import { Suspense } from "react";
import Loader from "@/components/loader";
import { VoiceNotesDashboard } from "./voice-notes-dashboard";

export default function VoiceNotesPage() {
  return (
    <Suspense fallback={<Loader />}>
      <VoiceNotesDashboard />
    </Suspense>
  );
}
