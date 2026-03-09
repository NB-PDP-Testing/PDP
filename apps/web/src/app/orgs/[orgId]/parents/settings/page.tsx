import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { SettingsContent } from "./settings-content";

export const metadata: Metadata = {
  title: "Settings | Parent Dashboard",
  description: "Manage your account settings",
};

type ParentSettingsPageProps = {
  params: Promise<{ orgId: string }>;
};

export default async function ParentSettingsPage({
  params,
}: ParentSettingsPageProps) {
  const { orgId } = await params;

  return (
    <div className="space-y-6">
      <OrgThemedGradient
        className="rounded-lg p-4 shadow-md md:p-6"
        gradientTo="secondary"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Settings className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl">Settings</h1>
            <p className="text-sm opacity-90">
              Configure your account and notification preferences
            </p>
          </div>
        </div>
      </OrgThemedGradient>
      <SettingsContent orgId={orgId} />
    </div>
  );
}
