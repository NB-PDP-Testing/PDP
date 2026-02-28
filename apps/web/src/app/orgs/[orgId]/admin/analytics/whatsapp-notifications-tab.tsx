"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Smartphone,
  Users,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WhatsappNotificationsTabProps = {
  organizationId: string;
};

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChannelBadge({
  channel,
}: {
  channel: "whatsapp_flows" | "sms_conversational" | "sms";
}) {
  if (channel === "whatsapp_flows") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-800 text-xs">
        <MessageSquare className="h-3 w-3" />
        WhatsApp Flows
      </span>
    );
  }
  if (channel === "sms_conversational") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 text-xs">
        <MessageSquare className="h-3 w-3" />
        WhatsApp Chat
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 text-xs">
      <Smartphone className="h-3 w-3" />
      SMS
    </span>
  );
}

export function WhatsappNotificationsTab({
  organizationId,
}: WhatsappNotificationsTabProps) {
  const today = new Date().toISOString().split("T")[0];

  const summary = useQuery(
    api.models.whatsappWellness.getTodayDispatchSummary,
    { organizationId, today }
  );

  const channelBreakdown = useQuery(
    api.models.whatsappWellness.get30DayChannelBreakdown,
    { organizationId }
  );

  const dispatchErrors = useQuery(
    api.models.whatsappWellness.getDispatchErrors,
    { organizationId }
  );

  if (
    summary === undefined ||
    channelBreakdown === undefined ||
    dispatchErrors === undefined
  ) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Loading notifications data…
      </div>
    );
  }

  const fallbacks = dispatchErrors.filter((e) => e.eventType === "fallback");
  const failures = dispatchErrors.filter((e) => e.eventType === "failed");

  return (
    <div className="space-y-6">
      {/* Today's summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Today&apos;s Dispatch Summary
          </CardTitle>
          <CardDescription>
            {today} — {summary.totalOptedIn} players opted in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-3 text-center">
              <div className="font-bold text-2xl text-green-600">
                {summary.flowsSent}
              </div>
              <div className="text-muted-foreground text-xs">
                WhatsApp Flows Sent
              </div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="font-bold text-2xl text-green-700">
                {summary.flowsCompleted}
              </div>
              <div className="text-muted-foreground text-xs">
                WhatsApp Flows Done
              </div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="font-bold text-2xl text-blue-600">
                {summary.smsSent}
              </div>
              <div className="text-muted-foreground text-xs">SMS Sent</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="font-bold text-2xl text-slate-600">
                {summary.skippedAppCheckin}
              </div>
              <div className="text-muted-foreground text-xs">
                Skipped (app check-in)
              </div>
            </div>
          </div>
          <p className="mt-3 text-muted-foreground text-xs">
            ✅ WhatsApp Flows: {summary.flowsSent} sent,{" "}
            {summary.flowsCompleted} completed
            {summary.flowsSent > 0
              ? ` (${Math.round((summary.flowsCompleted / summary.flowsSent) * 100)}%)`
              : ""}
            {" | "}📱 SMS: {summary.smsSent} sent, {summary.smsCompleted}{" "}
            completed
            {summary.smsSent > 0
              ? ` (${Math.round((summary.smsCompleted / summary.smsSent) * 100)}%)`
              : ""}
            {" | "}⏭ Skipped (already checked in via app):{" "}
            {summary.skippedAppCheckin}
          </p>
        </CardContent>
      </Card>

      {/* 30-day channel breakdown chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">30-Day Channel Breakdown</CardTitle>
          <CardDescription>
            Daily check-in counts by source channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {channelBreakdown.every(
            (d) =>
              d.app === 0 &&
              d.whatsapp_flows === 0 &&
              d.whatsapp_conversational === 0 &&
              d.sms === 0
          ) ? (
            <p className="py-6 text-center text-muted-foreground text-sm">
              No check-in data in the last 30 days.
            </p>
          ) : (
            <ResponsiveContainer height={220} width="100%">
              <BarChart
                data={channelBreakdown.map((d) => ({
                  ...d,
                  shortDate: formatShortDate(d.date),
                }))}
                margin={{ bottom: 0, left: -10, right: 0, top: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="shortDate"
                  interval="preserveStartEnd"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="app" fill="#94a3b8" name="App" stackId="a" />
                <Bar
                  dataKey="whatsapp_flows"
                  fill="#22c55e"
                  name="WhatsApp Flows"
                  stackId="a"
                />
                <Bar
                  dataKey="whatsapp_conversational"
                  fill="#3b82f6"
                  name="WhatsApp Chat"
                  stackId="a"
                />
                <Bar dataKey="sms" fill="#64748b" name="SMS" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Fallback events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4 text-amber-500" />
            Fallback Events (last 7 days)
          </CardTitle>
          <CardDescription>
            Times WhatsApp Flows fell back to SMS due to Meta API errors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fallbacks.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              No fallback events in the last 7 days.
            </div>
          ) : (
            <div className="space-y-2">
              {fallbacks.map((event) => (
                <div
                  className="flex flex-wrap items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                  key={event._id}
                >
                  <span className="font-mono text-muted-foreground text-xs">
                    {formatTimestamp(event.timestamp)}
                  </span>
                  <ChannelBadge channel={event.channel} />
                  <Badge variant="outline">Fallback to SMS</Badge>
                  {event.error && (
                    <span className="text-amber-700 text-xs">
                      {event.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <XCircle className="h-4 w-4 text-red-500" />
            Error Log (last 7 days)
          </CardTitle>
          <CardDescription>
            Failed dispatch attempts that couldn&apos;t be delivered via any
            channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {failures.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              No delivery failures in the last 7 days.
            </div>
          ) : (
            <div className="space-y-2">
              {failures.map((event) => (
                <div
                  className="flex flex-wrap items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm"
                  key={event._id}
                >
                  <span className="font-mono text-muted-foreground text-xs">
                    {formatTimestamp(event.timestamp)}
                  </span>
                  <ChannelBadge channel={event.channel} />
                  <Badge variant="destructive">Failed</Badge>
                  {event.error && (
                    <span className="text-red-700 text-xs">{event.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Not-registered info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Not Registered
          </CardTitle>
          <CardDescription>
            Players in target teams who haven&apos;t registered a phone for
            wellness check-ins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {summary.totalOptedIn > 0 ? (
              <>
                {summary.totalOptedIn} player
                {summary.totalOptedIn !== 1 ? "s" : ""} currently opted in for
                WhatsApp/SMS wellness check-ins. To invite more players, ask
                them to register their phone in{" "}
                <span className="font-medium">
                  Settings → Wellness Check-Ins
                </span>
                .
              </>
            ) : (
              "No players are currently opted in for WhatsApp/SMS wellness check-ins. Ask players to register their phone in Settings → Wellness Check-Ins."
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
