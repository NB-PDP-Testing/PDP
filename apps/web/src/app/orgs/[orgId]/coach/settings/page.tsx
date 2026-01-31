import type { Metadata } from "next";
import { NotificationPreferences } from "./notification-preferences";

export const metadata: Metadata = {
  title: "Settings | Coach Dashboard",
  description: "Manage your notification preferences and settings",
};

export default function CoachSettingsPage() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your notification preferences and account settings
        </p>
      </div>

      <NotificationPreferences />
    </div>
  );
}
