import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings | Parent Dashboard",
  description: "Manage your account settings",
};

export default function ParentSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl text-gray-900">Settings</h1>
        <p className="text-gray-600 text-sm">
          Configure your account and notification preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="text-gray-600" size={20} />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <Settings className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="text-gray-500">Settings page coming soon</p>
          <p className="mt-2 text-gray-400 text-sm">
            Manage notifications, privacy, and account preferences here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
