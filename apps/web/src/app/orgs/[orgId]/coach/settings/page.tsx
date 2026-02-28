"use client";

import { MyRolesSection } from "@/components/settings/my-roles-section";
import { GesturePreferences } from "./gesture-preferences";
import { NotificationPreferences } from "./notification-preferences";

export default function CoachSettingsPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="font-bold text-2xl">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your coach preferences and notification settings.
        </p>
      </div>

      <MyRolesSection />

      <NotificationPreferences />

      <GesturePreferences />
    </div>
  );
}
