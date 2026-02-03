import type { Metadata } from "next";
import { ParentCommsSettings } from "@/components/coach/parent-comms-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GesturePreferences } from "./gesture-preferences";
import { NotificationPreferences } from "./notification-preferences";

export const metadata: Metadata = {
  title: "Settings | Coach Dashboard",
  description: "Manage your notification preferences and settings",
};

type CoachSettingsPageProps = {
  params: Promise<{
    orgId: string;
  }>;
};

export default async function CoachSettingsPage({
  params,
}: CoachSettingsPageProps) {
  const { orgId } = await params;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your notification preferences and account settings
        </p>
      </div>

      <NotificationPreferences />

      <GesturePreferences />

      <Card>
        <CardHeader>
          <CardTitle>Parent Communications</CardTitle>
          <CardDescription>
            Configure how AI-generated summaries are written for parents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ParentCommsSettings organizationId={orgId} />
        </CardContent>
      </Card>
    </div>
  );
}
