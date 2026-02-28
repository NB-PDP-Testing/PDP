"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, CheckCircle, MessageSquare, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Days of week for the active-days checkboxes
const DAYS_OF_WEEK = [
  { value: "Mon", label: "Mon" },
  { value: "Tue", label: "Tue" },
  { value: "Wed", label: "Wed" },
  { value: "Thu", label: "Thu" },
  { value: "Fri", label: "Fri" },
  { value: "Sat", label: "Sat" },
  { value: "Sun", label: "Sun" },
];

const ALL_DAYS = DAYS_OF_WEEK.map((d) => d.value);
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// 15-minute increment times for the send-time select (00:00 – 23:45)
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h += 1) {
  for (let m = 0; m < 60; m += 15) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    TIME_OPTIONS.push(`${hh}:${mm}`);
  }
}

// Common IANA timezones
const TIMEZONE_OPTIONS = [
  { value: "Europe/Dublin", label: "Europe/Dublin (IST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (CET/CEST)" },
  { value: "America/New_York", label: "America/New_York (ET)" },
  { value: "America/Chicago", label: "America/Chicago (CT)" },
  { value: "America/Denver", label: "America/Denver (MT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
];

type Props = {
  organizationId: string;
  userId: string;
};

export function WellnessDispatchSection({ organizationId, userId }: Props) {
  const wellnessOrgConfig = useQuery(
    api.models.playerHealthChecks.getWellnessOrgConfig,
    { organizationId }
  );
  const dispatchStatus = useQuery(
    api.models.playerHealthChecks.getWhatsappDispatchStatus,
    { organizationId }
  );
  const channelCounts = useQuery(api.models.whatsappWellness.getChannelCounts, {
    organizationId,
  });
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId,
  });
  const updateConfig = useMutation(
    api.models.playerHealthChecks.updateWellnessOrgConfig
  );

  // Local state
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [dispatchTime, setDispatchTime] = useState("08:00");
  const [dispatchTimezone, setDispatchTimezone] = useState("Europe/Dublin");
  const [activeDays, setActiveDays] = useState<string[]>(ALL_DAYS);
  const [targetTeamIds, setTargetTeamIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Populate from existing config
  useEffect(() => {
    if (wellnessOrgConfig) {
      setWhatsappEnabled(wellnessOrgConfig.whatsappEnabled ?? false);
      setDispatchTime(wellnessOrgConfig.dispatchTime ?? "08:00");
      setDispatchTimezone(
        wellnessOrgConfig.dispatchTimezone ?? "Europe/Dublin"
      );
      setActiveDays(wellnessOrgConfig.dispatchActiveDays ?? ALL_DAYS);
      setTargetTeamIds(wellnessOrgConfig.dispatchTargetTeamIds ?? []);
    }
  }, [wellnessOrgConfig]);

  const toggleDay = (day: string) => {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleTeam = (teamId: string) => {
    setTargetTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSave = async () => {
    if (!wellnessOrgConfig) {
      return;
    }
    setSaving(true);
    try {
      await updateConfig({
        organizationId,
        updatedBy: userId,
        remindersEnabled: wellnessOrgConfig.remindersEnabled,
        reminderFrequency: wellnessOrgConfig.reminderFrequency,
        reminderType: wellnessOrgConfig.reminderType,
        lowScoreAlertsEnabled: wellnessOrgConfig.lowScoreAlertsEnabled,
        lowScoreThreshold: wellnessOrgConfig.lowScoreThreshold,
        whatsappEnabled,
        dispatchTime,
        dispatchTimezone,
        dispatchActiveDays: activeDays,
        dispatchTargetTeamIds: targetTeamIds,
      });
      toast.success("WhatsApp dispatch settings saved");
    } catch {
      toast.error("Failed to save dispatch settings");
    } finally {
      setSaving(false);
    }
  };

  // Compute next dispatch preview (local timezone display only)
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: date/day calculation logic
  const nextDispatchPreview = (() => {
    if (!whatsappEnabled || activeDays.length === 0) {
      return null;
    }
    const dayAbbrevToNum: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const activeDayNums = activeDays
      .map((d) => dayAbbrevToNum[d])
      .filter((n) => n !== undefined)
      .sort((a, b) => a - b);

    const now = new Date();
    const [hStr, mStr] = dispatchTime.split(":");
    const sendHour = Number.parseInt(hStr ?? "8", 10);
    const sendMin = Number.parseInt(mStr ?? "0", 10);

    for (let offset = 0; offset <= 7; offset += 1) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + offset);
      const candidateDay = candidate.getDay();
      if (!activeDayNums.includes(candidateDay)) {
        continue;
      }
      candidate.setHours(sendHour, sendMin, 0, 0);
      if (candidate <= now) {
        continue;
      }
      const optedIn =
        (channelCounts?.whatsappFlows ?? 0) +
        (channelCounts?.smsConversational ?? 0);
      const dayName = candidate.toLocaleDateString("en-IE", {
        weekday: "long",
        timeZone: dispatchTimezone,
      });
      const dateStr = candidate.toLocaleDateString("en-IE", {
        day: "numeric",
        month: "short",
        timeZone: dispatchTimezone,
      });
      return `Next dispatch: ${dayName} ${dateStr} at ${dispatchTime} ${dispatchTimezone} to ${optedIn} opted-in player${optedIn === 1 ? "" : "s"}`;
    }
    return null;
  })();

  const metaConfigured = dispatchStatus?.metaFlowsConfigured ?? false;
  const twilioConfigured = dispatchStatus?.twilioConfigured ?? false;
  const showSection = metaConfigured || twilioConfigured;

  if (!showSection) {
    return null;
  }

  return (
    <div className="space-y-4 border-t pt-6">
      <p className="font-semibold text-sm">
        Push Notifications (WhatsApp / SMS)
      </p>

      {/* Master toggle */}
      <div className="flex min-h-[44px] items-center gap-3 rounded-lg border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">
            Enable WhatsApp/SMS wellness check-ins
          </p>
          <p className="text-muted-foreground text-xs">
            Send daily wellness check-in messages to opted-in players via
            WhatsApp or SMS
          </p>
        </div>
        <Switch
          aria-label="Enable WhatsApp/SMS wellness check-ins"
          checked={whatsappEnabled}
          onCheckedChange={setWhatsappEnabled}
        />
      </div>

      {/* Integration status */}
      <div className="flex flex-wrap gap-2">
        {metaConfigured ? (
          <Badge className="gap-1 bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3" />
            WhatsApp Flows active
          </Badge>
        ) : (
          <Badge
            className="gap-1 bg-yellow-100 text-yellow-700"
            variant="outline"
          >
            <AlertTriangle className="h-3 w-3" />
            WhatsApp Flows not configured — only SMS will be used
          </Badge>
        )}
        {twilioConfigured && (
          <Badge className="gap-1 bg-blue-100 text-blue-700">
            <MessageSquare className="h-3 w-3" />
            SMS active
          </Badge>
        )}
      </div>

      {/* Channel counts */}
      {channelCounts && (
        <p className="text-muted-foreground text-xs">
          Players with WhatsApp:{" "}
          <span className="font-medium text-foreground">
            {channelCounts.whatsappFlows}
          </span>{" "}
          will receive WhatsApp Flows. Players with SMS only:{" "}
          <span className="font-medium text-foreground">
            {channelCounts.smsConversational}
          </span>{" "}
          will receive text messages. Players not registered:{" "}
          <span className="font-medium text-foreground">
            {channelCounts.notRegistered}
          </span>
          .
        </p>
      )}

      {whatsappEnabled && (
        <div className="space-y-4 pl-2">
          {/* Send time */}
          <div className="space-y-2">
            <Label>Send Time</Label>
            <Select onValueChange={setDispatchTime} value={dispatchTime}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              onValueChange={setDispatchTimezone}
              value={dispatchTimezone}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active days */}
          <div className="space-y-2">
            <Label>Active Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                // biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is inside label (Radix button, not input)
                <label
                  className="flex cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                  key={day.value}
                >
                  <Checkbox
                    checked={activeDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                className="h-7 px-2 text-xs"
                onClick={() => setActiveDays(ALL_DAYS)}
                size="sm"
                type="button"
                variant="outline"
              >
                Every Day
              </Button>
              <Button
                className="h-7 px-2 text-xs"
                onClick={() => setActiveDays(WEEKDAYS)}
                size="sm"
                type="button"
                variant="outline"
              >
                Weekdays
              </Button>
            </div>
          </div>

          {/* Target teams */}
          {teams && teams.length > 0 && (
            <div className="space-y-2">
              <Label>Target Teams</Label>
              <p className="text-muted-foreground text-xs">
                Leave all unchecked to send to all teams.
              </p>
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded border p-2">
                {teams.map((team) => (
                  // biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is inside label (Radix button, not input)
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                    key={team._id}
                  >
                    <Checkbox
                      checked={targetTeamIds.includes(team._id)}
                      onCheckedChange={() => toggleTeam(team._id)}
                    />
                    {team.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Next dispatch preview */}
          {nextDispatchPreview && (
            <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground text-xs">
              {nextDispatchPreview}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Dispatch Settings"}
        </Button>
      </div>
    </div>
  );
}
