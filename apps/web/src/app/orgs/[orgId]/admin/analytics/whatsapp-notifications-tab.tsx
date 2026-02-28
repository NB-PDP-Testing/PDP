"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Smartphone,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
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
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type WhatsappNotificationsTabProps = {
  organizationId: string;
};

type PlayerStatus = {
  playerIdentityId: string;
  firstName: string;
  lastName: string;
  wellnessChannel?: "whatsapp_flows" | "sms_conversational";
  whatsappOptIn?: boolean;
  lastCheckDate?: string;
  lastCheckScore?: number;
  lastCheckSource?:
    | "app"
    | "whatsapp_flows"
    | "whatsapp_conversational"
    | "sms";
};

function PlayerStatusRow({ player }: { player: PlayerStatus }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {player.firstName} {player.lastName}
      </TableCell>
      <TableCell>
        {player.wellnessChannel ? (
          <ChannelBadge channel={player.wellnessChannel} />
        ) : (
          <span className="text-muted-foreground text-xs">Not set</span>
        )}
      </TableCell>
      <TableCell>
        {player.whatsappOptIn ? (
          <span className="flex items-center gap-1 text-green-700 text-xs">
            <CheckCircle2 className="h-3 w-3" />
            Opted in
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">Opted out</span>
        )}
      </TableCell>
      <TableCell>
        <CheckSourceCell
          checkDate={player.lastCheckDate}
          source={player.lastCheckSource}
        />
      </TableCell>
      <TableCell className="text-right">
        {player.lastCheckScore !== undefined ? (
          <span className="font-mono text-sm">
            {player.lastCheckScore.toFixed(1)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

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

function sourceToChannelBadgeKey(
  source: "app" | "whatsapp_flows" | "whatsapp_conversational" | "sms"
): "whatsapp_flows" | "sms_conversational" | "sms" {
  if (source === "whatsapp_flows") {
    return "whatsapp_flows";
  }
  if (source === "whatsapp_conversational") {
    return "sms_conversational";
  }
  return "sms";
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

function CheckSourceCell({
  checkDate,
  source,
}: {
  checkDate?: string;
  source?: "app" | "whatsapp_flows" | "whatsapp_conversational" | "sms";
}) {
  if (!checkDate) {
    return <span className="text-muted-foreground text-xs">None today</span>;
  }
  if (source && source !== "app") {
    return <ChannelBadge channel={sourceToChannelBadgeKey(source)} />;
  }
  return <span className="text-muted-foreground text-xs">App</span>;
}

function NotRegisteredContent({
  channelCounts,
}: {
  channelCounts?: { notRegistered: number };
}) {
  if (channelCounts === undefined) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }
  if (channelCounts.notRegistered === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        All active adult players are opted in for wellness check-ins.
      </div>
    );
  }
  return (
    <p className="text-muted-foreground text-sm">
      {channelCounts.notRegistered} player
      {channelCounts.notRegistered !== 1 ? "s" : ""} registered but not opted
      in. Use &quot;Send Nudge&quot; to send them an in-app reminder to set up
      their wellness channel in{" "}
      <span className="font-medium">Settings → Wellness Check-Ins</span>.
    </p>
  );
}

function PlayerStatusTableContent({
  playerStatuses,
}: {
  playerStatuses?: PlayerStatus[];
}) {
  if (playerStatuses === undefined) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }
  if (playerStatuses.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No players have registered a wellness channel yet.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead>Channel</TableHead>
          <TableHead>Opt-in</TableHead>
          <TableHead>Today&apos;s Check</TableHead>
          <TableHead className="text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {playerStatuses.map((player) => (
          <PlayerStatusRow key={player.playerIdentityId} player={player} />
        ))}
      </TableBody>
    </Table>
  );
}

export function WhatsappNotificationsTab({
  organizationId,
}: WhatsappNotificationsTabProps) {
  const today = new Date().toISOString().split("T")[0];
  const [isSendingNudges, setIsSendingNudges] = useState(false);

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

  const channelCounts = useQuery(api.models.whatsappWellness.getChannelCounts, {
    organizationId,
  });

  const playerStatuses = useQuery(
    api.models.whatsappWellness.getPlayerWellnessStatuses,
    { organizationId }
  );

  const sendNudges = useMutation(
    api.models.whatsappWellness.sendWellnessRegistrationNudges
  );

  async function handleSendNudges() {
    setIsSendingNudges(true);
    try {
      const result = await sendNudges({ organizationId });
      toast.success(
        result.sent > 0
          ? `Nudge sent to ${result.sent} player${result.sent !== 1 ? "s" : ""}`
          : "No eligible players to nudge right now"
      );
    } catch {
      toast.error("Failed to send nudges");
    } finally {
      setIsSendingNudges(false);
    }
  }

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

      {/* Not-registered players with nudge */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Not Registered
                {channelCounts !== undefined &&
                  channelCounts.notRegistered > 0 && (
                    <Badge variant="secondary">
                      {channelCounts.notRegistered}
                    </Badge>
                  )}
              </CardTitle>
              <CardDescription>
                Active adult players who haven&apos;t opted in for wellness
                check-ins
              </CardDescription>
            </div>
            {channelCounts !== undefined && channelCounts.notRegistered > 0 && (
              <Button
                disabled={isSendingNudges}
                onClick={handleSendNudges}
                size="sm"
                variant="outline"
              >
                <Bell className="mr-1.5 h-3.5 w-3.5" />
                {isSendingNudges ? "Sending…" : "Send Nudge"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <NotRegisteredContent channelCounts={channelCounts} />
        </CardContent>
      </Card>

      {/* Per-player status table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Player Wellness Status</CardTitle>
          <CardDescription>
            Channel registration and today&apos;s check-in status per player
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlayerStatusTableContent playerStatuses={playerStatuses} />
        </CardContent>
      </Card>
    </div>
  );
}
