import { User } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Profile | Parent Dashboard",
  description: "Manage your profile and preferences",
};

export default function ParentProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl text-gray-900">My Profile</h1>
        <p className="text-gray-600 text-sm">
          Manage your personal information and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="text-purple-600" size={20} />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <User className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="text-gray-500">Profile management coming soon</p>
          <p className="mt-2 text-gray-400 text-sm">
            Update your contact information and preferences here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
