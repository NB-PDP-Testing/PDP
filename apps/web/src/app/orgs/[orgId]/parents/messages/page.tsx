import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Messages | Parent Dashboard",
  description: "View messages from coaches",
};

export default function ParentMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl text-gray-900">Messages</h1>
        <p className="text-gray-600 text-sm">
          View and respond to messages from coaches
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="text-blue-600" size={20} />
            Messaging System
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <MessageCircle className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="text-gray-500">Messaging feature coming soon</p>
          <p className="mt-2 text-gray-400 text-sm">
            You'll be able to communicate with coaches directly from here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
