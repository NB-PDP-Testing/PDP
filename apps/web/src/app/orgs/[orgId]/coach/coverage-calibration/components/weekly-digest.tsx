"use client";

import { Bell, Clock, ExternalLink, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WeeklyDigest({ color }: { color: string }) {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <p className="text-center text-gray-500 text-xs">
        Max 1 push notification per week — Apple HIG &quot;Passive&quot; level
        (notification center only)
      </p>

      {/* Mobile notification mockup */}
      <Card className="overflow-hidden rounded-2xl shadow-xl">
        <CardContent className="p-0">
          {/* iOS-style notification header */}
          <div className="flex items-center gap-3 border-b bg-gray-50/80 px-4 py-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: color }}
            >
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">PlayerARC</p>
              <p className="text-gray-400 text-xs">Weekly Summary</p>
            </div>
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <Clock className="h-3 w-3" />
              <span>Sunday 9am</span>
            </div>
          </div>

          {/* Notification body */}
          <div className="space-y-3 p-4">
            <p className="font-medium text-gray-900">
              Your Weekly Coaching Summary
            </p>

            <div className="space-y-2 text-gray-600 text-sm">
              <p>This week: 7 insights across 5 players</p>
              <p>
                Monthly coverage:{" "}
                <span className="font-semibold" style={{ color }}>
                  16/18 (89%)
                </span>
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-3">
              <p className="mb-1 font-medium text-amber-800 text-sm">
                2 players due for a check-in:
              </p>
              <div className="space-y-1 text-amber-700 text-sm">
                <p>Finn B. (18 days)</p>
                <p>Roisin K. (21 days)</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 gap-1"
                size="sm"
                style={{ backgroundColor: color, color: "white" }}
              >
                Open Dashboard
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button
                className="flex-1 text-gray-500"
                size="sm"
                variant="outline"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-400" />
            <CardTitle className="text-base">
              Digest Preferences (Coach Controls)
            </CardTitle>
          </div>
          <CardDescription>
            Coach configures when and how they receive their weekly digest
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Delivery Day", value: "Sunday", options: "Mon-Sun" },
            { label: "Delivery Time", value: "9:00 AM", options: "Any time" },
            {
              label: "Include Quality Scores",
              value: "Yes",
              options: "Yes/No",
            },
            {
              label: "Include Birth Quarter Data",
              value: "No",
              options: "Yes/No",
            },
          ].map((pref) => (
            <div
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              key={pref.label}
            >
              <div>
                <p className="font-medium text-gray-700 text-sm">
                  {pref.label}
                </p>
                <p className="text-gray-400 text-xs">{pref.options}</p>
              </div>
              <Badge variant="outline">{pref.value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Research */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="py-3">
          <div className="space-y-1 text-gray-500 text-xs">
            <p>
              <span className="font-medium">MobileLoud 2025:</span> 10% opt-out
              at 1/week, 40% opt-out at 3-6/week
            </p>
            <p>
              <span className="font-medium">Apple HIG:</span> Coverage digests =
              &quot;Passive&quot; level — notification center only, never
              time-sensitive
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
