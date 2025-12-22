"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  AlertTriangle,
  Phone,
  Pill,
  User,
  Loader2,
  Heart,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

/**
 * Compact emergency contact card for quick access during training/matches
 */
export function EmergencyContactCard({
  playerName,
  primaryContactName,
  primaryContactPhone,
  secondaryContactName,
  secondaryContactPhone,
  hasAllergies,
  hasConditions,
  allergies,
  conditions,
}: {
  playerName: string;
  primaryContactName: string;
  primaryContactPhone: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  hasAllergies?: boolean;
  hasConditions?: boolean;
  allergies?: string[];
  conditions?: string[];
}) {
  return (
    <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <User className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold">{playerName}</p>
              <div className="flex gap-1 mt-1">
                {hasAllergies && (
                  <Badge className="bg-orange-100 text-orange-700 text-xs py-0">
                    <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                    Allergy
                  </Badge>
                )}
                {hasConditions && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs py-0">
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                    Condition
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <a
            href={`tel:${primaryContactPhone}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <Phone className="h-5 w-5" />
          </a>
        </div>
        
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{primaryContactName}</span>
            <a href={`tel:${primaryContactPhone}`} className="font-mono font-medium text-red-600 hover:underline">
              {primaryContactPhone}
            </a>
          </div>
          {secondaryContactName && secondaryContactPhone && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{secondaryContactName}</span>
              <a href={`tel:${secondaryContactPhone}`} className="font-mono text-muted-foreground hover:underline">
                {secondaryContactPhone}
              </a>
            </div>
          )}
        </div>

        {(hasAllergies || hasConditions) && (
          <div className="mt-3 pt-3 border-t border-red-100">
            <div className="flex flex-wrap gap-1">
              {allergies?.map((allergy) => (
                <Badge key={allergy} className="bg-orange-200 text-orange-800 text-xs">
                  {allergy}
                </Badge>
              ))}
              {conditions?.map((condition) => (
                <Badge key={condition} className="bg-purple-200 text-purple-800 text-xs">
                  {condition}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Emergency info button that shows a quick popup with emergency contacts
 * Use in player lists, team views, etc.
 */
export function EmergencyInfoButton({
  profile,
  playerName,
  compact = false,
}: {
  profile: {
    emergencyContact1Name?: string;
    emergencyContact1Phone?: string;
    emergencyContact2Name?: string;
    emergencyContact2Phone?: string;
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
    bloodType?: string;
  } | null;
  playerName: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!profile) {
    return (
      <Button
        disabled
        size={compact ? "sm" : "default"}
        variant="outline"
        className="text-muted-foreground"
      >
        <Phone className="h-4 w-4" />
        {!compact && <span className="ml-2">No Info</span>}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={compact ? "sm" : "default"}
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Phone className="h-4 w-4" />
          {!compact && <span className="ml-2">Emergency</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Heart className="h-5 w-5" />
            Emergency Info: {playerName}
          </DialogTitle>
          <DialogDescription>
            Quick access to emergency contacts and critical medical information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Emergency Contacts */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Emergency Contacts
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{profile.emergencyContact1Name || "Not set"}</p>
                  <Badge className="bg-red-600 text-xs">Primary</Badge>
                </div>
                <a
                  href={`tel:${profile.emergencyContact1Phone}`}
                  className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  <Phone className="h-4 w-4" />
                  <span className="font-mono">{profile.emergencyContact1Phone || "N/A"}</span>
                </a>
              </div>
              {profile.emergencyContact2Name && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{profile.emergencyContact2Name}</p>
                    <Badge variant="outline" className="text-xs">Secondary</Badge>
                  </div>
                  <a
                    href={`tel:${profile.emergencyContact2Phone}`}
                    className="flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="font-mono text-sm">{profile.emergencyContact2Phone}</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Critical Alerts */}
          {((profile.allergies?.length ?? 0) > 0 || (profile.conditions?.length ?? 0) > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Critical Alerts
              </h3>
              <div className="space-y-2">
                {(profile.allergies?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-orange-800 text-sm font-medium mb-1">Allergies:</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.allergies?.map((allergy) => (
                        <Badge key={allergy} className="bg-orange-200 text-orange-800">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(profile.conditions?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-purple-800 text-sm font-medium mb-1">Conditions:</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.conditions?.map((condition) => (
                        <Badge key={condition} className="bg-purple-200 text-purple-800">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medications & Blood Type */}
          <div className="grid grid-cols-2 gap-3">
            {profile.bloodType && (
              <div className="rounded-lg border p-3 text-center">
                <p className="text-muted-foreground text-xs uppercase">Blood Type</p>
                <p className="font-bold text-lg text-red-600">{profile.bloodType}</p>
              </div>
            )}
            {(profile.medications?.length ?? 0) > 0 && (
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs uppercase mb-1">Medications</p>
                <div className="flex flex-wrap gap-1">
                  {profile.medications?.map((med) => (
                    <Badge key={med} className="bg-blue-100 text-blue-700 text-xs">
                      {med}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Grid of emergency contact cards for a team/group
 * Use on team view pages for quick emergency access
 */
export function EmergencyContactsGrid({
  organizationId,
}: {
  organizationId: string;
}) {
  const allProfiles = useQuery(api.models.medicalProfiles.getAllForOrganization, {
    organizationId,
  });

  if (allProfiles === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const playersWithProfiles = allProfiles.filter((p) => p.hasProfile);

  if (playersWithProfiles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Phone className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-medium">No emergency contacts available</p>
          <p className="text-muted-foreground text-sm">
            Players need medical profiles with emergency contacts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {playersWithProfiles.map((player) => (
        <EmergencyContactCard
          key={player.player._id}
          playerName={player.player.name}
          primaryContactName={player.profile?.emergencyContact1Name || "Not set"}
          primaryContactPhone={player.profile?.emergencyContact1Phone || "N/A"}
          secondaryContactName={player.profile?.emergencyContact2Name}
          secondaryContactPhone={player.profile?.emergencyContact2Phone}
          hasAllergies={player.hasAllergies}
          hasConditions={player.hasConditions}
          allergies={player.profile?.allergies}
          conditions={player.profile?.conditions}
        />
      ))}
    </div>
  );
}

/**
 * Compact summary of medical alerts for a player
 * Use inline in player lists, tables, etc.
 */
export function MedicalAlertsBadges({
  hasAllergies,
  hasMedications,
  hasConditions,
  showClear = false,
}: {
  hasAllergies?: boolean;
  hasMedications?: boolean;
  hasConditions?: boolean;
  showClear?: boolean;
}) {
  if (!hasAllergies && !hasMedications && !hasConditions) {
    return showClear ? (
      <Badge variant="outline" className="text-green-600">
        Clear
      </Badge>
    ) : null;
  }

  return (
    <div className="flex gap-1">
      {hasAllergies && (
        <Badge className="bg-orange-100 text-orange-700" title="Has Allergies">
          <AlertCircle className="h-3 w-3" />
        </Badge>
      )}
      {hasMedications && (
        <Badge className="bg-blue-100 text-blue-700" title="On Medications">
          <Pill className="h-3 w-3" />
        </Badge>
      )}
      {hasConditions && (
        <Badge className="bg-purple-100 text-purple-700" title="Has Conditions">
          <AlertTriangle className="h-3 w-3" />
        </Badge>
      )}
    </div>
  );
}
